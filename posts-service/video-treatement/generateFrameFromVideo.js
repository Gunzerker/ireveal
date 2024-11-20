const ffmpeg = require("fluent-ffmpeg");
const AWS = require("aws-sdk");
AWS.config.loadFromPath("../config/config.json");
const s3 = new AWS.S3({ apiVersion: "2006-03-01" });
const uploadParams = { Bucket: "digit-u-media-resources", Key: "", Body: "" };
const mime = require("mime");
const fs = require("fs")
const axios = require("axios")
const config = require ("../config/config.json");
const { reject } = require("bluebird");

function uploadMedia(path , key) {
  return new Promise(async (resolve, reject) => {
    try {
      // Configure the file stream and obtain the upload parameters
      var fileStream = fs.readFileSync(path);

      uploadParams.Body = fileStream;
      uploadParams.Key = key;
      console.log(uploadParams.Key);
      uploadParams.ACL = "public-read";
      uploadParams.ContentType = mime.getType(path); // => 'text/plain'

      // call S3 to retrieve upload file to specified bucket
      const upload = await s3.upload(uploadParams).promise();
      console.log(upload.Location);
      return resolve(upload.Location);
    } catch (err) {
      return reject(err);
    }
  });
}

async function applyFilterVideo (url , key , filter) {
  return new Promise((resolve,reject)=> {
     ffmpeg()
      .input(url)
      .videoFilters(
        `curves=psfile=../video-traitement/filters/${filter}.acv`
      )
      .output("./asset/filtred-" + key)
      .on("start", function (commandLine) {
      })
      .on("error", function (err) {
        console.log("An error occurred: " + err.message);
      })
      .on("progress", function (progress) {
      })
      .on("end", async function () {
        console.log("done filter apply")
        let path = "./asset/filtred-" + key;
        let s3_key = "filtred-" + key;
        let returned_url = await uploadMedia(path, s3_key);
        return resolve({url:returned_url,key:s3_key , path})
      }).run()
  })
}

async function resizeVideo (url , key) {
  // resize the outputed video
  return new Promise ((resolve,reject)=> {
      ffmpeg(url)
        .autopad(true)
        .size("1280x720")
        .output("./asset/resized-" + key)
        .on("error", function (err) {
          console.log("An error occurred: " + err.message);
        })
        .on("progress", function (progress) {
        })
        .on("end", async function () {
          console.log("Finished processing");
          //upload to s3
          console.log("resized-key",key)
          let path = "./asset/resized-" + key;
          let s3_key = "resized-" + key;
          let returned_url = await uploadMedia(path, s3_key);
          return resolve({ url: returned_url, key: s3_key ,path });
          // get the thumbnail from the end video
        })
        .run();
  })
}

async function thumbnailVideo (path , key) {
  return new Promise ((resolve,reject)=>{
     ffmpeg(path)
              .on("filenames", function (filenames) {
                console.log("Will generate " + "thumbnail-");
              })
              .on("error", function (err) {
                console.log("An error occurred: " + err.message);
                //return reject(err);
              })
              .on("end", async function () {
                console.log("Screenshots taken");
                let path =
                  "./asset/thumbnail-" + key.replace(".mp4", ".jpeg");
                let s3_key = "thumbnail-" + key.replace(".mp4", ".jpeg");
                let returned_url = await uploadMedia(path, s3_key);
                //await fs.unlinkSync(path);
                return resolve({ url: returned_url, key: s3_key, path });
              })
              .screenshots({
                timestamps: ["00:00.01"],
                filename: "thumbnail-" + ".jpeg",
                folder: "./asset",
                //size:"1280x720"
              });
  })
}

payload = "https://digit-u-ireveal-resources.s3.eu-central-1.amazonaws.com/663bce3f-563f-402b-9bfd-dea70d1de953.mp4";
thumbnailVideo(payload)

module.exports = async function frame(payload) {
  return new Promise (async (resolve,reject) => {
    const { url, key, filter } = payload;
    console.log(payload)
    let result_filtred_video;
    let result_resized_video;
    let result_thumbnail_video;
    try{
      if (filter === "original") {
        result_resized_video = await resizeVideo(url, key);
        result_thumbnail_video = await thumbnailVideo(
          result_resized_video.url,
          key
        );
        fs.unlinkSync(result_resized_video.path);
        fs.unlinkSync(result_thumbnail_video.path);
      } else {
        result_filtred_video = await applyFilterVideo(url, key, filter);
        result_resized_video = await resizeVideo(
          result_filtred_video.url,
          key
        );
        result_thumbnail_video = await thumbnailVideo(
          result_resized_video.url,
          key
        );

        fs.unlinkSync(result_filtred_video.path);
        fs.unlinkSync(result_resized_video.path);
        fs.unlinkSync(result_thumbnail_video.path);
      }
      return resolve({
        result_resized_video,
        result_thumbnail_video,
      });
    }catch(err){
      reject (err)
    }

})
}