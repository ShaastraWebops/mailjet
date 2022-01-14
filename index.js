const jet = require("node-mailjet");
const fs = require("fs");
const csv = require("csvtojson");
const dotenv = require("dotenv");

dotenv.config();

const mailjet = jet.connect(process.env.KEY, process.env.PASSWORD);

function validateEmail(email) {
  const re =
    /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email);
}

//This Function automatically saves all mails which were sent successfully
const successOp = (result, mail) => {
  const temp = result.body["Messages"][0];
  console.log(mail, ":", temp["Status"]);
  fs.appendFile("./success.csv", `${mail}\n`, () => console.log());
};

//This Function automatically saves all mails which failed
const failOp = (err, mail) => {
  fs.appendFile("./failed.csv", `${mail}\n`, () => console.log());
  console.log(mail, ": ", err["ErrorMessage"]);
};

//This Function automatically saves all mails with invalid addresses
const invalidOp = (mail) => {
  fs.appendFile("./invalid.csv", `${mail}\n`, () => console.log());
  console.log(mail, ": ", "invalid Email Address");
};

//main function starts
const start = async () => {
  const sent_already = (
    await csv({ noheader: false }).fromFile("./sent.csv")
  ).map((obj) => obj["Email"]);
  // var jsonArray = await csv().fromFile("./pending.csv"); //You can change the 'pending.csv' to other path if you want
  // let all = jsonArray.map((obj) => obj["Email Address"]); //List of all mail ids
  let all = ["janithms9920@gmail.com"];
  const success = (
    await csv({ noheader: false }).fromFile("./success.csv")
  ).map((obj) => obj["Email"]);
  const concurrents = 50;
  const body = fs.readFileSync("./content/stu.html", { encoding: "ascii" });
  // this is the main content of the mail. Teams will provide you this.
  //Change the path to where you put the content file
  //You can only send html or text content in mails

  //ATTACHMENTS: in case they're needed. NOTE the "base64" encoding.
  //Change the paths accordingly.
  // const img = fs.readFileSync('./attachments/tif.png', { encoding: "base64" });
  // const pdf = fs.readFileSync('./attachments/Workshops.pdf', { encoding: "base64" });
  //   const files = [
  //     {
  //       ContentType: "application/pdf",
  //       Filename: "test.pdf",
  //       Base64Content: fs.readFileSync("./attachments/test.pdf", {
  //         encoding: "base64",
  //       }),
  //     },
  //     {
  //       ContentType: "image/jpeg",
  //       Filename: "1.jpeg",
  //       Base64Content: fs.readFileSync("./attachments/before.jpeg", {
  //         encoding: "base64",
  //       }),
  //     },
  //     {
  //       ContentType: "image/jpeg",
  //       Filename: "2.jpeg",
  //       Base64Content: fs.readFileSync("./attachments/during.jpeg", {
  //         encoding: "base64",
  //       }),
  //     },
  //     {
  //       ContentType: "image/jpeg",
  //       Filename: "3.jpeg",
  //       Base64Content: fs.readFileSync("./attachments/after.jpeg", {
  //         encoding: "base64",
  //       }),
  //     },
  //   ];
  let to = all.filter((id) => validateEmail(id) && !success.includes(id));
  const invalid = all.filter((id) => !validateEmail(id));
  invalid.forEach(invalidOp);

  const sendMail = async (index) => {
    // if (success.includes(to[index])) {
    //   if (index + concurrents < to.length) sendMail(concurrents + index);
    //   return
    // }

    // if (!validateEmail(to[index])) {
    //   invalidOp(to[index]);
    //   if (index + concurrents < to.length) sendMail(concurrents + index);
    //   return;
    // }
    mailjet
      .post("send", { version: "v3.1" })
      .request({
        Messages: [
          {
            From: {
              Email: "no-reply@shaastra.org",
              Name: "Shaastra, IIT Madras",
            },
            To: [
              {
                Email: to[index],
              },
            ],
            Subject: "Regarding Test Certificate", //This is the main Subject of the mail, Ask the teams what subject do they want to put in
            HTMLPart: body,
            // Cc: [
            //   {
            //     Email: "guhan.narayanan@shaastra.org"
            //   }
            // ]
            // Attachments: [ //This is the attachments Part, uncomment if you want to add attachments
            // {
            //   ContentType: "video/mp4",
            //   Filename: "How to join a club tournament",
            //   Base64Content: video
            // }
            // {
            //   ContentType: "application/pdf",
            //   Filename: "Workshops.pdf",
            //   Base64Content: pdf
            // }
            // {
            //   ContentType: "image/png",
            //   Filename: "TIF.png",
            //   Base64Content: img
            // }
            // ]
            // Attachments: files
          },
        ],
      })
      .then((result) => {
        successOp(result, to[index]);
        if (index + concurrents < to.length) sendMail(concurrents + index);
      })
      .catch((err) => {
        failOp(err, to[index]);
        if (index + concurrents < to.length) sendMail(concurrents + index);
      });
  };

  for (let i = 0; i < Math.min(concurrents, to.length); i++) {
    sendMail(i);
  }
};

start();
