const functions = require("firebase-functions");
const admin = require("firebase-admin");

//  this is to initialize the app to use "Cloud Functions"
admin.initializeApp(functions.config().firebase);

//  on friend request sent
exports.sendNotificationOnFriendRequest = functions.database
  .ref("/Notifications/{receiver_id}/{push_id}")
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

    //  sender's reference
    const sendersReference = admin
      .database()
      .ref(`/Users/${senderId}`)
      .once("value");

    return sendersReference.then(info => {
      const senderUsername = info.val().user_name;
      const sendersImageUrl = info.val().user_image;

      //  getting receiver's device token
      const receiversReference = admin
        .database()
        .ref(`/Users/${receiverId}`)
        .once("value");
      return receiversReference.then(receiversData => {
        const deviceToken = receiversData.val().device_token;

        let payload = {
          data: {
            title: "New Friend Request",
            body: `${senderUsername} has sent you a friend request `,
            icon: "default",
            clickAction: "openProfileActivity",
            type: "sentRequest",
            senderId,
            imageUrl: sendersImageUrl
          }
        };
        return admin
          .messaging()
          .sendToDevice(deviceToken, payload)
          .then(response => {
            return console.log("sendNotificationOnFriendRequest sent");
          })
          .catch(e => {
            return console.log(e);
          });
      });
    });
  });

//    on message sent
exports.sendNotificationOnMessageSent = functions.database
  .ref("/MessageReferenceForNotifications/{senderId}/{receiverId}/{pushId}")
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
      //  grabbing the device token
      return admin
        .database()
        .ref(`/Users/${receiverId}/device_token`)
        .once("value")
        .then(response => {
          let deviceToken = response.val();

          //  getting the sender's image
          return admin
            .database()
            .ref(`/Users/${senderId}`)
            .once("value")
            .then(response => {
              let sendersImageUrl = response.val().user_image;
              let username = response.val().user_name;

              let payload = {
                data: {
                  title: "New Message",
                  body: `${username} has sent you a new message`,
                  clickAction: "openMainActivity",
                  type: "message",
                  imageUrl: sendersImageUrl,
                  senderId,
                  pushId
                }
              };

              //  sending the data to the receiver
              return admin
                .messaging()
                .sendToDevice(deviceToken, payload)
                .then(response => {
                  return console.log("sendNotificationOnMessageSent sent");
                })
                .catch(err => {
                  return console.log(err);
                });
            });
        });
    } else {
      return 0;
    }
  });

//    for accepting friend request
exports.sendNotificationOnAcceptingRequest = functions.database
  .ref("/FriendsReferenceForNotification/{receiver_id}/{sender_id}")
  .onWrite((event, context) => {
    if (!event.after.exists()) {
      return 0;
    }

    const senderId = context.params.sender_id;
    const receiverId = context.params.receiver_id;
    const request = event.after.val().request;

    if (request === "accepted") {
      return admin
        .database()
        .ref(`/Users/${senderId}`)
        .once("value")
        .then(snapshot => {
          const imageUrl = snapshot.val().user_image;
          const deviceToken = snapshot.val().device_token;

          //  getting receiver's username
          let receiversReference = admin
            .database()
            .ref(`/Users/${receiverId}`)
            .once("value");
          return receiversReference.then(receiversData => {
            const receiversUsername = receiversData.val().user_name;

            let payload = {
              data: {
                title: "New Message",
                body: `${receiversUsername} accepted your friend request `,
                clickAction: "openMainActivity",
                type: "acceptRequest",
                imageUrl: imageUrl,
                senderId
              }
            };

            return admin
              .messaging()
              .sendToDevice(deviceToken, payload)
              .then(response => {
                return console.log("sendNotificationOnAcceptingRequest sent");
              })
              .catch(err => {
                return console.log(err);
              });
          });
        });
    } else {
      return 0;
    }
  });
