/**
 * Created by kehoro on 26/01/17.
 */
"use strict"
console.log("Loading function");
const path = require('path');
const cheerio = require('cheerio');
const request = require('request');
const async = require('async');
const _ = require('lodash');
const AWS = require("aws-sdk");

AWS.config.update({region: process.env.AWS_REGION});
const docClient = new AWS.DynamoDB.DocumentClient();

const urlSearchPlaystation = 'http://haku.helmet.fi/iii/encore/search/C__S%28ps4%20%7C%20%28playstation%204%29%29__O-date__U__X0?lang=eng&suite=cobalt';


exports.handler = (event, context, callback) => {

  let titleToUrl = {};
  async.waterfall([
      (callback) => {
        request({
          url: urlSearchPlaystation,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, ' +
            'like Gecko) Chrome/55.0.2883.87 Safari/537.36'
          }
        }, callback)
      },
      (response, body, callback) => {
        let $ = cheerio.load(body);
        let titles = $('span.title a');
        let gameTitles = [];

        titles.each((i, elem) => {
          // console.log('prcessing: ', $(this).text().trim());
          let title = $(this).text().trim();
          gameTitles.push(title);
          titleToUrl[title] = $(this).attr('href');
        });

        callback(null, gameTitles)

      },
      (existingTitles, callback) => {

        let storedTitles = [];
        let params = {
          TableName: process.env.TABLE_NAME
        };
        docClient.scan(params, (err, data) => {
          // console.log(data);
          if (err) {
            callback(err)
          } else if (data.Items && data.Items.length > 0) {
            data.Items.forEach((existingTitles) => {
              storedTitles.push(existingTitles.title);
            });
          }

          // compare latest titles to the stored titles
          let newTitles = _.difference(existingTitles, storedTitles);
          let removedTitles = _.difference(storedTitles, existingTitles);

          callback(null, existingTitles, newTitles, removedTitles);
        });
      },
      (existingTitles, newTitles, removedTitles, callback) => {

        // start parallel tasks to add new titles and also remove old ones
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
            }],
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
            message += title + "\n\thttp://haku.helmet.fi" + titleToUrl[title] + "\n";
          });
          message += "\nRemoved Titles (" + removedTitles.length + "):\n" + removedTitles.join("\n");

          let sns = new AWS.SNS();
          let params = {
            Message: message,
            Subject: `New titles found! (${newTitles.length})`,
            TopicArn: process.env.SNS_TOPIC_ARN
          };
          console.log('===SENDING EMAIL===');
          sns.publish(params, (err, result) => {
            if (err) {
              console.error("ERROR:", err);
              callback(err);
            }
            else {
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