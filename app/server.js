import botkit from 'botkit';
import Yelp from 'yelp'


// botkit controller
const controller = botkit.slackbot({
  debug: false,
});

// initialize slackbot
const slackbot = controller.spawn({
  token: process.env.SLACK_BOT_TOKEN,
  // this grabs the slack token we exported earlier
}).startRTM(err => {
  // start the real time message client
  if (err) { throw new Error(err); }
});

//initialize Yelp
var yelp = new Yelp({
  consumer_key: 'caJCmFh9k-pV2dAwQpgxcw',
  consumer_secret: 'fKK9I0v4A7ta1aw5ZYqwX4tgvok',
  token: '4ijLgjsqKIcGcIHcwGdmcToXt3yKadi-',
  token_secret: 'PnsjAaKnfJKiqgTYRVy9cTcNAfY',
});

// prepare webhook
// for now we won't use this but feel free to look up slack webhooks
controller.setupWebserver(process.env.PORT || 3001, (err, webserver) => {
  controller.createWebhookEndpoints(webserver, slackbot, () => {
    if (err) { throw new Error(err); }
  });
});

controller.on('wake', (bot, message) => {
  bot.replyPublic(message, 'yeah yeah');
});

// example hello response
controller.hears(['hello', 'hi', 'howdy', 'hey'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.api.users.info({ user: message.user }, (err, res) => {
    if (res) {
      bot.reply(message, `Hello, ${res.user.name}!`);
    } else {
      bot.reply(message, 'Hello there!');
    }
  });
});

//Food query
// example hello response
controller.hears(['Feed me!'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {

  //found code for the utterances and general info on botkit from https://github.com/dado3212/slackattack/blob/master/app/server.js
  const giveInstructions = (response, convo) => {
    convo.ask('Would you like to find a place to eat?',[
      {
        pattern: bot.utterances.yes,
        callback: function(response,convo) {
          convo.say('Great! I will continue...');
          askForFoodType(response, convo);
          convo.next();
        }
      },
      {
        pattern: bot.utterances.no,
        callback: function(response,convo) {
          convo.say('Perhaps later.');
          // do something else...
          convo.next();
        }
      },
      {
        default: true,
        callback: function(response,convo) {
          // just repeat the question
          convo.say('I did not get that');
          convo.repeat();
          convo.next();
        }
      }
    ]);
  }

  const askForFoodType = (response, convo) => {
    convo.ask('What type of food would you like to eat?', (response, convo) => {
      convo.say('Awesome!');
      askForLocation(response, convo, response.text);
      convo.next();
    });
  }

  const askForLocation = (response, convo, food) => {
    convo.ask('What city and state in the US are you located in?', (response, convo) => {
      convo.say('Alright! Let me get your best restaurant result!');
      convo.next();


      //pass in the parrameters to yelp to search for by highest rating, #2
      yelp.search({ term: food, location: response.text})
      .then(data => {

        var reply_with_attachments = {
        'username': 'rajiv-bot ',
        'text': 'Here is what I recommend you try!',
        'attachments': [
        {
          'title': `${data.businesses[0].name}, Rating: ${data.businesses[0].rating}`,
          'image_url': `${data.businesses[0].image_url}`,
          'text':  `${data.businesses[0].snippet_text} ${data.businesses[0].url}`,
          'color': '#7AD1A7'
        }
        ],
        'icon_url': `${data.businesses[0].image_url}`
        }

        bot.reply(message, reply_with_attachments);
        console.log(data);
      })
      .catch(err => {
        if (JSON.parse(err.data).error.id === 'UNAVAILABLE_FOR_LOCATION') {
          convo.say('That food type is not available in that location, please try again!');
          convo.next();
        }
        else {
          convo.say('There was an error fulfilling your request, please try again!');
          convo.next();
        }
      });

    });
  }
  bot.startConversation(message, giveInstructions);
});

//help response
controller.hears(['help'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.api.users.info({ user: message.user }, (err, res) => {
    if (res) {
      bot.reply(message, 'Hello, I am  @rajiv-bot and I can help you find food in different areas using Yelp! \
Simply respond to me with "Feed me!" and follow along!');
    }
  });
});

console.log('starting bot');
