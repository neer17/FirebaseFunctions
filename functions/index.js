const functions = require('firebase-functions');
const admin = require('firebase-admin');

//  this is to initialize the app to use "Cloud Functions"
admin.initializeApp(functions.config().firebase);

//  on friend request sent
exports.sendNotificationOnFriendRequest = functions.database
  .ref('/Notifications/{receiver_id}/{push_id}')
  .onWrite((event, context) => {
    //  getting receiverUid and senderUid from "notifications" reference
    const receiverId = context.params.receiver_id;
    const push_id = context.params.push_id;

    //  if the data does not exist on the reference then returning
    if (!event.after.exists()) {
      return 0;
    }

    //  grabbing sender's id
    const senderId = event.after.val().from;

    let senderUsername;
    let sendersImageUrl;
    //  sender's reference
    return admin
      .database()
      .ref(`/Users/${senderId}`)
      .once('value')
      .then(info => {
        senderUsername = info.val().user_name;
        sendersImageUrl = info.val().user_image;

        // returning reference to receiverUser node to continue chaining
        return admin
          .database()
          .ref(`/Users/${receiverId}`)
          .once('value');
      })
      .then(receiversData => {
        //  getting receiver's device token
        let deviceToken = receiversData.val().device_token;

        let payload = {
          data: {
            title: 'New Friend Request',
            body: `${senderUsername} has sent you a friend request `,
            icon: 'default',
            clickAction: 'openProfileActivity',
            type: 'sentRequest',
            senderId,
            imageUrl: sendersImageUrl
          }
        };

        // send data if deviceToken exists
        if (deviceToken) {
          //  sending the data to the receiver
          return admin.messaging().sendToDevice(deviceToken, payload);
        } else {
          return new Error('deviceToken not found or receiver logged out');
        }
      })
      .then(response => console.log('sendNotificationOnFriendRequest sent'))
      .catch(e => console.log(e));
  });

//    on message sent
exports.sendNotificationOnMessageSent = functions.database
  .ref('/MessageReferenceForNotifications/{senderId}/{receiverId}/{pushId}')
  .onWrite((event, context) => {
    let senderId = context.params.senderId;
    let receiverId = context.params.receiverId;
    let pushId = context.params.pushId;

    // if the message has been deleted
    if (!event.after.exists()) {
      return 0;
    }

    //  to shouldn't be null
    if (receiverId) {
      let message;
      return admin
        .database()
        .ref(`/Messages/${senderId}/${receiverId}/${pushId}`)
        .once('value')
        .then(messageData => {
          message = messageData.val().message;

          // returning ref to "Users" node to continue chaining
          return admin
            .database()
            .ref('/Users')
            .once('value');
        })
        .then(users => {
          let deviceToken = users.child(receiverId).val().device_token;

          //  getting the sender's image
          let sendersImageUrl = users.child(senderId).val().user_image;
          let username = users.child(senderId).val().user_name;

          let payload = {
            data: {
              title: 'New Message',
              body: `${username} has sent you a new message`,
              clickAction: 'openMainActivity',
              type: 'message',
              imageUrl: sendersImageUrl,
              receiverId,
              username,
              senderId,
              message,
              pushId
            }
          };

          // send data if deviceToken exists
          if (deviceToken) {
            //  sending the data to the receiver
            return admin.messaging().sendToDevice(deviceToken, payload);
          } else {
            return new Error('deviceToken not found or user logged out');
          }
        })
        .then(response => console.log('sendNotificationOnMessageSent sent'))
        .catch(err => console.log(err));
    } else {
      return 0;
    }
  });

//    for accepting friend request
exports.sendNotificationOnAcceptingRequest = functions.database
  .ref('/FriendsReferenceForNotification/{receiver_id}/{sender_id}')
  .onWrite((event, context) => {
    if (!event.after.exists()) {
      return 0;
    }

    const senderId = context.params.sender_id;
    const receiverId = context.params.receiver_id;
    const request = event.after.val().request;

    if (request === 'accepted') {
      return admin
        .database()
        .ref(`/Users`)
        .once('value')
        .then(users => {
          const imageUrl = users.child(senderId).val().user_image;
          const deviceToken = users.child(senderId).val().device_token;
          const receiversUsername = users.child(receiverId).val().user_name;

          let payload = {
            data: {
              title: 'New Message',
              body: `${receiversUsername} accepted your friend request `,
              clickAction: 'openMainActivity',
              type: 'acceptRequest',
              imageUrl: imageUrl,
              senderId
            }
          };

          // send data if deviceToken exists
          if (deviceToken) {
            //  sending the data to the receiver
            return admin.messaging().sendToDevice(deviceToken, payload);
          } else {
            return new Error('deviceToken not found or receiver logged out');
          }
        })
        .then(response =>
          console.log('sendNotificationOnAcceptingRequest sent')
        )
        .catch(err => console.log(err));
    } else {
      return 0;
    }
  });
