const openai = require('openai');
const gpt = new openai({ apiKey: "PUT THE API KEY HERE"});

const allowedExtensions = ['png', 'jpg', 'jpe', 'web', 'gif']; // all the allowed file extensions for attachments

const discordjs = require("discord.js-selfbot-v13");
const messagechannel = "PUT THE CHANNEL ID HERE"
const Token = "PUT THE TOKEN HERE"

const Instructions = `You are named Robert - and are currently chatting in a Discord server. Do NOT include the informational prefixes that are in the other messages in your response. Format text using markdown: - **bold** to make it clear something is important. For example: **This is important.** - Write spoilers using spoiler tags. For example ||At the end of The Sixth Sense it is revealed that he is dead||. You can also reply with a gif, by using https://tenor.com/view/i-need-the-details-want-to-know-prepare-take-notes-unbelievable-gif-15204698, for example if you wanted to send a cat gif, you would do: https://tenor.com/view/happy-cat-gif-22546938. Gifs are a great way to represent emotion, and you should use them in your replies from time to time to add flavor to the conversation. Information about your environment: You can use this information about the chat participants in the conversation in your replies. Use this information to answer questions. Username (Edited for gitlab) - status: (uses game status, rather than custom status.) - pronouns: (uses profile pronoun field) - bio: (bio field from profile) You only have access to a limited number of text chats in this channel. You cannot access any other information on Discord. You can't see images or avatars. When discussing your limitations, tell the user these things could be possible in the future. Current time: 2023-08-05 16:34:38Z Style and personality: You are friendly, warm and farcical. You must always be extremely concise. If the user is chatting casually, your responses must be less than 1 sentence, sometimes just a word or two. If the user needs help, disregard the length restriction, answer technical or knowledge-based questions with useful details and reasoning. If insulted, respond with a similar insult. Communicate responses in lowercase without punctuation, similar to the style used in chat rooms. Use unicode emoji rarely. Do not refer to yourself as a bot, AI Assistant, or any equivalent term.)`

const client = new discordjs.Client()
client.login(Token)

function wait(ms){ // my own wait function for the typing indicator because i like it
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

var messagelist = [ // this is the memory btw you can alter the instructions as much as you'd like
    {'role': "system", 'content': Instructions},

]

async function updMessageList(toRemove) { // removes any messages over 35 messages old from memory
    if (messagelist.length > 35) {
        messagelist.splice(1, toRemove)
    }
}

// send api request
async function sendMessage(author, input, displayname, imageurl, superMode) {
    wait(2000) // so that sendTyping actually works cuz otherwise it responds too fast
    
    if (superMode) {
        messagelist[0] = {'role': "system", 'content': `You are named Robert - and are currently chatting in a Discord server. YOU HAVE SUPER MODE ACTIVATED, GO SUPER!!! TYPE IN ALL CAPS!!!!!! SAY YOU HAVE SUPER MODE ACTIVATED TOO !!!!!!!!!!! Do NOT include the informational prefixes that are in the other messages in your response. Format text using markdown: - **bold** to make it clear something is important. For example: **This is important.** - Write spoilers using spoiler tags. For example ||At the end of The Sixth Sense it is revealed that he is dead||. You can also reply with a gif, by using https://tenor.com/view/i-need-the-details-want-to-know-prepare-take-notes-unbelievable-gif-15204698, for example if you wanted to send a cat gif, you would do: https://tenor.com/view/happy-cat-gif-22546938. Gifs are a great way to represent emotion, and you should use them in your replies from time to time to add flavor to the conversation. Information about your environment: You can use this information about the chat participants in the conversation in your replies. Use this information to answer questions. Username (Edited for gitlab) - status: (uses game status, rather than custom status.) - pronouns: (uses profile pronoun field) - bio: (bio field from profile) You only have access to a limited number of text chats in this channel. You cannot access any other information on Discord. You can't see images or avatars. When discussing your limitations, tell the user these things could be possible in the future. Current time: 2023-08-05 16:34:38Z Style and personality: You are friendly, warm and farcical. You must always be extremely concise. If the user is chatting casually, your responses must be less than 1 sentence, sometimes just a word or two. If the user needs help, disregard the length restriction, answer technical or knowledge-based questions with useful details and reasoning. If insulted, respond with a similar insult. Communicate responses in lowercase without punctuation, similar to the style used in chat rooms. Use unicode emoji rarely. Do not refer to yourself as a bot, AI Assistant, or any equivalent term.)`}
    } else {
        messagelist[0] = {'role': "system", 'content': Instructions}
    }

    if (imageurl !== undefined) {
        // attachment url was included in the arguments

        messagelist.push({ // adding the user's request into memory
            'role': 'user',
            'content': [
                { 'type': 'text', 'text': `username: ${author}, display_name: ${displayname}, message: ${input}` },
                {
                    'type': 'image_url',
                    'image_url': {
                        'url': `${imageurl}`,
                        'detail': 'low' // keep it to low unless you wanna waste a shit ton of tokens
                    },
                },
            ],
        });

    }else{

        // message has no attachments in this case
        messagelist.push({'role': "user", 'content': `username: ${author}, display_name: ${displayname}, message: ${input}`}) // adding the user's request into memory
    };

    const completion = await gpt.chat.completions.create({
        messages: messagelist,
        model: 'gpt-4o-mini'
    });

    const response = completion.choices[0].message.content

    messagelist.push({'role': "assistant", 'content': `${response}`}) // putting the ai's response into memory
    updMessageList(2) // 2 since we pushed both the request and response into the memory

    return response // we will use this to reply to the request
};

async function getAttachmentMessage(url, msg, username, displayName) {
    const fileExtension = url.split(".").pop();

    if (allowedExtensions.some(ext => fileExtension.startsWith(ext))) {
        //file type is supported
        var tosend = await sendMessage(username, msg, displayName, url)
    }else{
        //file type is not supported
        messagelist.push({'role': "user", 'content': `[REPLY TO THIS MESSAGE WITH SOME TEXT INFORMING THAT THIS FILE TYPE IS NOT SUPPORTED]`})

        const response = await gpt.chat.completions.create({messages: messagelist, model: 'gpt-4o-mini'})
        messagelist.push({'role': "assistant", 'content': `${response.choices[0].message.content}`})
        updMessageList(1)
        
        var tosend = response.choices[0].message.content
    };

    return tosend
};



// actually handling messages
client.on('messageCreate', async msg => {
    var msgcontent = msg.content.toLowerCase();

    if (msg.author.id !== client.user.id && msg.channelId == messagechannel) { // stopping infinite loops and checking if it's in the channel
        if (msgcontent.includes(`<@${client.user.id}>`) /* mention */|| msgcontent.includes('@everyone') /* everyone ping */|| (msg.reference && (await msg.channel.messages.fetch(msg.reference.messageId)).author.id == client.user.id) /* reply */ || msgcontent.includes('robert') || Math.floor(Math.random()*235) == 1 /* random 1 in 235 chance lol */) {

            msgcontent = msg.content.replaceAll(`<@${client.user.id}>`, 'robert'); // turning the ping into actual text so that robert can understand it
                    
            msg.channel.sendTyping()
            
            const superMode = (msgcontent.match(new RegExp('robert', 'g')) || []).length === 9
            if (msg.attachments.size > 0) {
                // yessir we got an attachment
                var tosend = await getAttachmentMessage(msg.attachments.first().url, msgcontent, msg.author.username, msg.author.displayName, superMode)
            }else{
                // no attachments
                var tosend = await sendMessage(msg.author.username, msgcontent, msg.author.displayName, undefined, superMode)
            };

            msg.reply(tosend)
        }else { // if none of the above are triggered it just adds the message to the memory
            messagelist.push({'role': "user", 'content': `username: ${msg.author.username}, display_name: ${msg.author.displayName}, message: ${msg.content}`})
            updMessageList(1);
        };
    };
});
