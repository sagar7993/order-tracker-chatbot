/**Neel Kirit
 *18-Mar-2016
 *
 */
var Mind = require('../../..');


// FOR CHAT CLIENT
var express = require('express');
// var router = express.Router();

//MAKE SERVER
var http = require('http');
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended : true}));
app.use(bodyParser.json());
app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

app.get('/ping', function(req, res) {
    res.type("text/plain");
    res.send("Server Running");
});

app.post('/analyze', function(req, res) {
    res.type("application/json");
    var text = req.body.text;
    var step = req.body.step;
    var action = req.body.action;
    analyzeUserQuery(text,res);
    
    console.log("*********Analyze "+text + " " + step+ " "+ action);
    

});

app.post('/sendMobileNumber', function(req, res) {
    res.type("application/json");
    var mobileNumber = req.body.mobileNumber;
    var step = req.body.step;
    var action = req.body.action;
    // cancellation_req(action,res);
    console.log("*********Mobile "+mobileNumber + " " + step+ " "+ action);
    // console.log(mobileNumber);
    user_info(step,mobileNumber,action,res);
    // res.send({ message: "Yo", buttonText: "", step: 1, action: 1});
});

app.post('/takeAction', function(req, res) {
    res.type("application/json");
    var action = req.body.action;
    switch(Number(action))
    {
        case 1: cancellation_req(action,res);
            break;
        case 2: replacement_req(Number(action),res);
            break;
        default: console.log("********************Some error with ACTION");
    }
    
    
    console.log(action);
    

});

app.listen(process.env.PORT || 4730);

var msg = null;
var sentiment = null;
var userInput


//******************************************************************//

function analyzeUserQuery(text,res){
    userInput = text;
    userInput.replace(/ /g, "+");
    var watson = require('watson-developer-cloud');
    var alchemy_language = watson.alchemy_language({
      api_key: '202b11e21809b84b4a60a7ac977c3cbfe6186504'
    })

    var parameters = {
      extract: 'entities,keywords',
      sentiment: 1,
      maxRetrieve: 1,
      text: userInput
    };

    // Starting Sentiment Analysis
    alchemy_language.combined(parameters, function (err, response) {
      if (err)
        console.log('error:', err);
      else
        // Sentiment Anlysis Successfully Done
        // Post Processing
        console.log(JSON.stringify(response, null, 2));
        if (response.keywords == "" || response.keywords == null || response.keywords == " " || response.keywords == undefined || response == null) {
            // throw new Error("No Keywords Extracted\nTry the query with some other keywords\nStack Trace:\n\n");
            nullKeysProcessor(res);

        } else {
            console.log("Keyword Extracted -  " + response.keywords[0].text);
            console.log("Sentiment Extracted - " + response.keywords[0].sentiment.type);
            console.log("Sentiment Score - " + response.keywords[0].sentiment.score);

            keysProcessor(response,res);
        }


        
    });
}

var request = require('request');
// var Client = require('node-rest-client').Client;

// var client = new Client();


console.log("##################################################");

var receivedData  = "";

//#######################################################//

function nullKeysProcessor(res) {
    res.send({ message: "Sorry I didn't get you, Try something like 'cancel my order' or 'track my order' ", buttonText: "", step: -1, action: 0});
}

//######################################################//


function keysProcessor(response,res) {
    // GET KEYWORD SCORE
    var score = response.keywords[0].sentiment.score * 1000;
    score = Math.abs(Math.round(score / 100));
    console.log("Score: "+score);

    // GET SENTIMENT TYPE
    console.log("##################################################");
    if (response.keywords[0].sentiment.type == "negative") {
        sentiment = 1;
    } else {
        sentiment = 0;
    }

    msg = response.keywords[0].text;
    //Check if multiple keywords or single keyword
    var space = 0;
    var keyword = 0;
    for (i = 0; i < msg.length; i++) {
        c = msg.charAt(i);
        if (c == ' ')
            keyword++;
    }

    //Assign No of keywords to keys
    keys = keyword;
    console.log("Nos: " + keyword);
    if (keyword > 0) {
        // MULTIPLE KEYWORD
        begin = 0;
        space = 0;


        blank = msg.indexOf(" ", space);
        // console.log("Space Position: " + blank);
        space = blank + 1;
        // console.log("Begin:  " + begin + "Blank:  " + blank);
        if (blank > 0) {
            key1 = msg.substring(begin, blank);
            begin = blank + 1;
            key2 = msg.substring(begin, msg.length)
        } else {
            key1 = msg.substring(begin, msg.length);
        }
        console.log("Machine Learning will be called\nKeywords: "+key1+" "+key2+"\nSentiment: "+sentiment+"\nNo of Keys: "+keys+"\nScore: "+score);
         ml(key1, key2, sentiment, keys, score,res);
        console.log("L97 "+key1+" "+key2);
        console.log("L98 No of keywords : " + keyword);
        keyword--;
        console.log("##################################################");




    } else {
        // SINGLE KEYWORD
        console.log("Machine Learning will be called "+msg+" "+sentiment+" "+score);
         ml(msg, "0", sentiment, 0, score,res);
    }
}

//#######################################################//

//Machine Learning Takes Place
//Training
function ml(msg1, msg2, sentiment, keys, score,res) {
    adjFlag = 0;
    adjIndex = 0;
    console.log("Received Keywords:  " + msg1 + " + " + msg2);

    console.log("Keys: " + keys);

    adj = [" ",
        "wrong", //1
        "bad", //2
        "cancel", //3
        "good", //4
        "damaged", //5
        "spoiled", //6
        "refund", //7
        "expired", //8
        "track", //9
    ];
    noun = [" ",
        "order", //1
        "item", //2 
        "product", //3
        "transaction", //4  
        "address", //5
        "bill", //6
    ];


    for (i = 0; i < adj.length; i++) {
        // console.log("Here");
        check1 = adj[i].match(msg1);
        check2 = adj[i].match(msg2);
        // console.log("CHECK1 "+check1);
        // console.log("CHECK2 "+check2);
        if (check1 != null || check2 != null) {
            adjFlag = 1;
            adjIndex = i;
            console.log("Adjective Index: " + adjIndex + "Flag: " + adjFlag);
        }
    }

    //Check if 2 keywords ADJ and NOUN is present
    if (keys > 0 && adjFlag == 1) {
        console.log("Learning Sample Set");
        if (sentiment == 1 || sentiment == 0) {

            // TRAIN THE MACHINE
            var mind = Mind({
                    activator: 'sigmoid'
                })
                .learn([{
                        input: [1, 1],
                        output: [0.1]
                    }, //problem with order
                    {
                        input: [3, 1],
                        output: [0.1]
                    }, //problem with order
                    {
                        input: [7, 1],
                        output: [0.1]
                    }, //problem with order
                    {
                        input: [1, 2],
                        output: [0.2]
                    }, //problem with item
                    {
                        input: [5, 2],
                        output: [0.2]
                    }, //problem with item
                    {
                        input: [6, 2],
                        output: [0.2]
                    }, //problem with item
                    {
                        input: [7, 2],
                        output: [0.1]
                    }, //problem with order
                    {
                        input: [8, 2],
                        output: [0.2]
                    }, //problem with item
                    {
                        input: [1, 3],
                        output: [0.2]
                    }, //problem with item
                    {
                        input: [5, 3],
                        output: [0.2]
                    }, //problem with item
                    {
                        input: [6, 3],
                        output: [0.2]
                    }, //problem with item
                    {
                        input: [7, 3],
                        output: [0.1]
                    }, //problem with order
                    {
                        input: [8, 3],
                        output: [0.2]
                    }, //problem with item
                    {
                        input: [8, 3],
                        output: [0.2]
                    }, //problem with item
                    {
                        input: [9, 1],
                        output: [0.3]
                    }, //track the order
                ]);

            var ind = 0;
            console.log("Received Noun "+msg2);   
            for (i = 0; i < noun.length; i++) {
                // console.log("Mapping Keywords");
                // check1 = noun[i].includes(msg1);
                check2 = noun[i].match(msg2);
                if (check2 != null) {
                    ind = i;
                    
                }


            }
            console.log("Noun Index: " + ind);
            console.log("Prediction Param : " + adjIndex+" "+ind);
            var result = mind.predict([adjIndex, ind]);
            console.log("Prediction "+result);
            if(adjIndex == 9){
                result = 0.3;
            }

            result = result * 100;
            result = Math.round(result / 10);
            if(result == undefined)
                res.send({ message: "Sorry I didn't get you, Try something like 'cancel my order' or 'track my order' ", buttonText: "", step: -1, action: 0});

             resolution(result,res);
        }

    } //For only Single KeyWord
    else if(keys == 0){
        if (sentiment == 1) {
            var mind = Mind({
                    activator: 'sigmoid'
                })
                .learn([
                    {
                        input: [0, 1, 6],
                        output: [0.1]
                    }, //problem with order
                    {
                        input: [0, 1, 3],
                        output: [0.3]
                    }, //track the order
                    {
                        input: [0, 3, 7],
                        output: [0.2]
                    }, //replace
                    {
                        input: [0, 2, 7],
                        output: [0.2]
                    }, //replace


                ]);


            var ind = 0;

            for (i = 0; i < noun.length; i++) {
                check = noun[i].match(msg1);
                if (check != null) {
                    ind = i;

                }

            }

            //PREDICT
            var result = mind.predict([0, ind, score]);

            console.log("Raw Result: "+result);
            if(adjIndex == 9){
                result = 0.3;
            }
            result = result * 100;
            result = Math.round(result / 10);
            if(result == undefined)
                res.send({ message: "Sorry I didn't get you, Try something like 'cancel my order' or 'track my order' ", buttonText: "", step: -1, action: 0});
             resolution(result,res);

        }
        else
        {
            res.send({ message: "Sorry I didn't get you, Try something like 'cancel my order' or 'track my order' ", buttonText: "", step: -1, action: 0});
        }


    }
    else{
        console.log("Coming here");
        if (sentiment == 1) {
            var mind = Mind({
                    activator: 'sigmoid'
                })
                .learn([
                    {
                        input: [0, 0, 6],
                        output: [0.1]
                    }, //problem with order
                    {
                        input: [0, 0, 3],
                        output: [0.3]
                    }, //track the order
                    {
                        input: [0, 0, 7],
                        output: [0.2]
                    }, //replace
                    {
                        input: [0, 0, 7],
                        output: [0.2]
                    }, //replace

                ]);


            var ind = 0;

            // for (i = 0; i < noun.length; i++) {
            //     check = noun[i].match(msg1);
            //     if (check != null) {
            //         ind = i;

            //     }

            // }

            //PREDICT
            var result = mind.predict([0, 0, score]);
            console.log("Raw Result: "+result);
            if(result == undefined)
                res.send({ message: "Sorry I didn't get you, Try something like 'cancel my order' or 'track my order' ", buttonText: "", step: -1, action: 0});
            // result = result * 100;
            // result = Math.round(result / 10);
            //  resolution(result,res);

        }
        else
        {
            res.send({ message: "Sorry I didn't get you, Try something like 'cancel my order' or 'track my order' ", buttonText: "", step: -1, action: 0});
        }


    }

    // console.log("Result: " + result); 

}
/*  
**  METHODS TO EVALUATE THE RESULT
**  AND TAKE NECCESARY ACTION
*/
function resolution(result,res) {
    action = ["",
        "Cancelling your Order, Refunding",
        "Replacing",
        "Track Order",

    ];

    console.log("Resolving Issue");
    console.log(action[result]);
    console.log("##################################################");
    switch (result) {
        case 1:
            console.log("Cancel Order");
            res.send({ message: "Sure, I'll cancel your order. Pls provide me you registered mobile number . ", buttonText: "", step: 1, action: 1});
            
            // user_info(1,res);
            break;
        case 2:
            console.log("Replace Order");
            res.send({ message: "Oops, I'll replace your product. Give me you registered mobile number . ", buttonText: "", step: 1, action: 2 });
            // user_info(2);
            break;
        case 3:
            console.log("Track Order");
            res.send({ message: "One Sec, Tell me you registered mobile number . ", buttonText: "Track", step: 1, action: 3 });
            // user_info(3);
            break;
        default:
        res.send({ message: "Sorry, we didnt understand. Please try again.", step: 1, action: 0 });
            console.log("Sorry, we didnt understand. Please try again.");
    }

}


//General Method to Get User Info
function user_info(step,mobileNumber,purpose,res) {
    console.log("Get user info");
    var userInputMobile = mobileNumber; //User Inputs Mobile Number
    
    console.log("RCVD ACTION "+purpose);
    request.post(
        'http://10.130.202.121:8080/user/findByMobileNumber',
        { json: { "mobileNumber": userInputMobile } },
        function (error, response, body) {
            if (!error && response.statusCode == 200) {
                // console.log(body)
                    //     console.log("User Name -  " + response.userName);   //Display Details
                if(body.length > 0) {
                    console.log("User ID -  " + body[0].id);
                    userId = body[0].id;
                    console.log("Retrieving Order Details");
                    console.log("##################################################");
                    console.log("RCVD ACTION 2 "+purpose);
                    switch(Number(purpose))
                    {
                        case 1:console.log("RCVD ACTION 3 "+purpose);
                                cancel(userId,purpose,res);
                                break;
                        case 2:replace(userId,purpose,res);
                                break;
                        case 3:track(userId,purpose,res);
                                break;
                    }
                }
                else{
                    res.send({ message: "Oops, That doesn't seem to be registered mobile number. Pls try again. ", buttonText: "", step: 1, action: Number(purpose) });
                }
            }
            else{
                res.send({ message: "Oops, That doesn't seem to be valid mobile number. Pls enter valid mobile number. ", buttonText: "", step: 1, action: Number(purpose) });
            }
        }
    );


}

var orderId = "";
//Cancel Order
function cancel(userId,action,res) {
    console.log("Inside cancel "+userId);
    request.post(
        'http://10.130.202.121:8080/dailyLog/findByUser',
        { json: { 'id': userId } },
        function (error, response, body) {
            if (!error && response.statusCode == 200) {
                // console.log(body)


                console.log("Total Amount -  " + body[0].amount);
                if (body[0].cancel == 0 && body[0].track!=2) {
                    console.log("##################################################");
                    console.log("##################################################");
                    console.log("##################################################");
                    console.log("##################################################");
                    console.log("Total Amount -  " + body[0].amount);
                    console.log("Items Ordered -  " + body[0].description);
                    orderId = body[0].id;
                    console.log("Order Id -  " + orderId);
                    res.send({ message: "Hi, "+body[0].user.userName+" .\n Are you sure, you want to cancel "+body[0].description+" ?", buttonText: "Cancel", step: 2, action: action});
                    // res.send({ message: "Cancel "+body[0].description, buttonText: "Cancel", step: 1, action: 1});
                    // cancellation_req(action,res)

                }
                else if(body[1].track==2)
                {   
                    console.log("##################################################");
                    console.log("##################################################");
                    console.log("Order Already Delivered. Cannot Cancel");
                    console.log("##################################################\n\n");
                    res.send({ message: "Sorry, Order is already Deliverd. Cannot cancel. Try replacing it. ", buttonText: "", step: 0, action: 0});
                } 
                else {
                    console.log("##################################################");
                    console.log("##################################################");
                    console.log("No Orders Found");
                    console.log("##################################################\n\n");
                    res.send({ message: "Sorry, I couldn't find any order from you. ", buttonText: "", step: 0, action: 0});


                }
            }
            else{
                console.log("ERROER REQ NOT RECEIVED BY SPRING "+error);
            }
        }
    );
    

}

function cancellation_req(action,res){
    var confirmAction = action;
    if (confirmAction == 1 ) {
        request.post(
            'http://10.130.202.121:8080/dailyLog/cancelOrder',
            { json: { 'id': orderId } },
            function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    res.send({ message: "Succesfully Cancelled ! Anything else I can help you with?", buttonText: "", step: 0, action: 0});
                }
            }
        );
        

    }
}


// Track Order
function track(userId,purpose,res)
{
    console.log("Usr: " + userId);

    request.post(
        'http://10.130.202.121:8080/dailyLog/findByUser',
        { json: { 'id': userId } },
        function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var track = body[0].track;

                switch(track)
                {
                    case 0:
                            console.log("##################################################");
                            console.log("##################################################");
                            console.log("Order is in warehouse");
                            console.log("##################################################\n\n");
                            res.send({ message: "Hi, "+body[0].user.userName+" .Your order "+body[0].description+" is still in warehouse ! Anything else I can help you with?", buttonText: "", step: 0, action: 0});
                            break;
                    case 1:
                            console.log("##################################################");
                            console.log("##################################################");
                            console.log("Order Dispatched. On way");
                            console.log("##################################################\n\n");
                            res.send({ message: "Hi, "+body[0].user.userName+" .Your order "+body[0].description+" is Dispatched. On way ! Anything else I can help you with?", buttonText: "", step: 0, action: 0});
                            break;
                    case 2:
                            console.log("##################################################");
                            console.log("##################################################");
                            console.log("Order Delivered.");
                            console.log("##################################################\n\n");
                            res.send({ message: "Hi, "+body[0].user.userName+" As per our records.Your order "+body[0].description+" was Succesfully Delivered ! Any issue with delivery ?", buttonText: "", step: 0, action: 0});
                            break;
                    default:console.log("ERROR");
                }
            }
        }
    );

}
//Replace Product
function replace(userId,purpose,res)
{
    request.post(
        'http://10.130.202.121:8080/dailyLog/findByUser',
        { json: { 'id': userId } },
        function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var cancel = body[0].cancel;
                var track = body[0].track;
                if (cancel == 0) {
                    console.log("##################################################");
                    switch(track)
                    {
                        case 0:
                                
                                res.send({ message: "Hi, "+body[0].user.userName+" .Your order "+body[0].description+" is still in warehouse ! Do you want to cancel it ?", buttonText: "", step: 2, action: 1});
                                break;
                        case 1:
                                
                                res.send({ message: "Hi, "+body[0].user.userName+" .Your order "+body[0].description+" is On way ! You can replace it only after Delivery. Anything else I can help you with?", buttonText: "", step: 0, action: 0});
                                break;
                        case 2:
                                
                                res.send({ message: "Hi, "+body[0].user.userName+" \n Are you sure, you want to replace  "+body[0].description+" ?", buttonText: "Replace", step: 2, action: 2});
                                orderId = body[0].id;
                                break;
                        default:console.log("ERROR");
                    }
                    
                    
                    
                   
                } else {
                    console.log("##################################################");
                    console.log("##################################################");
                    console.log("No Orders Found");
                    console.log("##################################################\n\n");
                    res.send({ message: "Hi, "+body[0].user.userName+", I cannot find any live orders in your account. Is there anything else I can help you with?", buttonText: "", step: 0, action: 0});

                }
            }
        }
    );


}

function replacement_req(action,res){
    res.send({ message: "Replacement request succesfully placed ! Anything else I can help you with?", buttonText: "", step: 0, action: 0});
}
