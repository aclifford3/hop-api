'use strict';

console.log('Loading function');

const doc = require('dynamodb-doc');

var AWS = require("aws-sdk");
const dynamo = new AWS.DynamoDB.DocumentClient();

/**
 * Demonstrates a simple HTTP endpoint using API Gateway. You have full
 * access to the request and response payload, including headers and
 * status code.
 */
exports.handler = (event, context, callback) => {
    //console.log('Received event:', JSON.stringify(event, null, 2));
    console.log(event)

    const done = (err, res) => callback(null, {
        statusCode: err ? '400' : '200',
        body: err ? err.message : JSON.stringify(res),
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
    });

    const tableName = process.env.RESERVATIONS_TABLE_NAME;

    switch (event.httpMethod) {
        case 'DELETE':
            var params = event.path.split('/')
            var propertyName = params[4]
            var checkInDate = params[6]
            console.log('Deleting propertyName ' + propertyName + ' and checkInDate ' + checkInDate);
            console.log("Params " + params);

            var params = {
                Key: {
                    'propertyName': unescape(propertyName),
                    'checkInDate': checkInDate
                },
                TableName : tableName
            };
            dynamo.delete(params, done);
            break;
        case 'GET':
            //Get reservation by property name and check in date
            if (event.path.includes('propertyName')) {
                var params = event.path.split('/')
                var propertyName = params[4]
                var checkInDate = params[6]

                //Get All Reservations
                var params = {
                    TableName : tableName,
                    Key: {
                        'propertyName': unescape(propertyName),
                        'checkInDate': checkInDate
                    }
                };
                dynamo.get(params, done);
            }
            //Get All Reservations
            else {
                var checkOutDate = new Date();
                var filterExpression;
                var eav;
                var scanIndexForward = true;
                if(event.path.includes('history')) {
                    var path = event.path;
                    var days = path.substring(path.indexOf('days/') + 'days/'.length, path.length);
                    console.log("Days is " + days);
                    checkOutDate.setDate(checkOutDate.getDate() - parseInt(days));
                    filterExpression = "checkOutDate > :checkOutDate AND checkOutDate < :today";
                    scanIndexForward = false;
                    eav = {
                        ":iteration": '1',
                        ":checkOutDate": checkOutDate.toISOString(),
                        ":today": new Date().toISOString()
                    };
                } else {
                    checkOutDate.setDate(checkOutDate.getDate()-1);
                    filterExpression = "checkOutDate > :checkOutDate";
                    eav = {
                        ":iteration": '1',
                        ":checkOutDate": checkOutDate.toISOString(),
                    };
                }
                var params = {
                    KeyConditionExpression: 'iteration = :iteration',
                    ExpressionAttributeValues: eav,
                    TableName : tableName,
                    IndexName : "iteration-checkInDate-index",
                    FilterExpression: filterExpression,
                    ScanIndexForward: scanIndexForward
                };
                dynamo.query(params, done);
            }
            break;
        case 'PUT':
            var data = JSON.parse(event.body)
            data.iteration = "1"
            dynamo.put({Item: data, TableName: tableName}, done);
            break;
        // case 'PUT':
        //     dynamo.updateItem(JSON.parse(event.body), done);
        //     break;
        default:
            done(new Error(`Unsupported method "${event.httpMethod}"`));
    }
};
