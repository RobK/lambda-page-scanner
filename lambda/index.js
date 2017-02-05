/**
 * Created by Robert Kehoe on 26/01/17.
 * MIT License, see included project license
 */
"use strict"

// Configuration
// This is the URL that will be queried / checked
const urlEndPoint = 'http://www.example.com/rss.php';

// This is the jQuery style selector, that will select the links you want to monitor
const selector = 'span.title a';



// Code 
console.log("Loading function");
const path = require('path');
const cheerio = require('cheerio');
const request = require('request');
const async = require('async');
const _ = require('lodash');
const AWS = require("aws-sdk");

AWS.config.update({ region: process.env.AWS_REGION });
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = (event, context, callback) => {

    let titleToUrl = {};
    async.waterfall([
            (callback) => {
                request({
                    url: urlEndPoint,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, ' +
                            'like Gecko) Chrome/55.0.2883.87 Safari/537.36'
                    }
                }, callback)
            },
            (response, body, callback) => {
                let $ = cheerio.load(body);
                let titles = $(selector);
                let gameTitles = [];

                titles.each((i, link) => {
                    //console.log('prcessing: ', $(link).text().trim());
                    let title = $(link).text().trim();
                    gameTitles.push(title);
                    titleToUrl[title] = $(link).attr('href');
                });

                if (response.statusCode !== 200) {
                    callback('Aborting, Did not get a status 200 from the server! Code: ' + response.statusCode);
                } else if (gameTitles.length === 0) {
                    callback('Aborting, no titles found on page (maybe it is down?)');
                } else {
                    callback(null, gameTitles)
                }
            },
            (scannedTitles, callback) => {

                let storedTitles = [];
                let params = {
                    TableName: process.env.TABLE_NAME
                };
                docClient.scan(params, (err, data) => {
                    // console.log(data);
                    if (err) {
                        callback(err)
                    } else if (data.Items && data.Items.length > 0) {
                        data.Items.forEach((scannedTitles) => {
                            storedTitles.push(scannedTitles.title);
                        });
                    }

                    // compare latest titles to the stored titles
                    let newTitles = _.difference(scannedTitles, storedTitles);
                    let removedTitles = _.difference(storedTitles, scannedTitles);

                    callback(null, scannedTitles, newTitles, removedTitles);
                });
            },
            (existingTitles, newTitles, removedTitles, callback) => {
                // start parallel tasks to add new title
                async.parallel([
                        (cb) => {
                            async.eachSeries(newTitles, (gameTitle, eachCallback) => {
                                let params = {
                                    TableName: process.env.TABLE_NAME,
                                    Item: {
                                        "title": gameTitle
                                    }
                                };
                                // put new items to DB!
                                docClient.put(params, eachCallback);
                            }, cb);
                        },
                        (cb) => {
                            async.eachSeries(removedTitles, (gameTitle, eachCallback) => {
                                let params = {
                                    TableName: process.env.TABLE_NAME,
                                    Key: {
                                        "title": gameTitle
                                    }
                                };
                                // delete old items
                                docClient.delete(params, eachCallback);
                            }, cb);
                        }
                    ],
                    (err, result) => {
                        //console.log('All parallel activities done!');
                        callback(err, existingTitles, newTitles, removedTitles);
                    }
                );
            },
            (existingTitles, newTitles, removedTitles, callback) => {

                if (newTitles.length > 0) {
                    let message = 'Found ' + newTitles.length + ' new titles on the page!\n\n' +
                        "New Titles:\n";

                    newTitles.forEach((title) => {
                        message += title + "\n\t" + titleToUrl[title] + "\n";
                    });
                    message += "\nRemoved Titles (" + removedTitles.length + "):\n" + removedTitles.join("\n");

                    let sns = new AWS.SNS();
                    let params = {
                        Message: message,
                        Subject: `${newTitles.length} new titles found!`,
                        TopicArn: process.env.SNS_TOPIC_ARN
                    };
                    console.log('===SENDING EMAIL===');
                    sns.publish(params, (err, result) => {
                        if (err) {
                            console.error("ERROR:", err);
                            callback(err);
                        } else {
                            console.log(message);
                            console.log("===EMAIL SENT===");
                            callback(null, existingTitles, newTitles, removedTitles);
                        }
                    });

                } else {
                    callback(null, existingTitles, newTitles, removedTitles);
                }
            }

        ],
        (err, existingTitles, newTitles, removedTitles) => {

            if (err) {
                console.error('EVERYTING BROKE!!!');
                console.error(err);
            } else {
                console.log('Added:', newTitles);
                console.log('>>>>>>>>>>>>>>>>>>>>>>>');
                console.log('Removed:', removedTitles);
                callback(null, newTitles);
            }
        });

}