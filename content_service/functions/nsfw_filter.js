const axios = require("axios"); //you can use any http client
const tf = require("@tensorflow/tfjs-node");
const nsfw = require("nsfwjs");
async function fn(url) {
  return new Promise (async(resolve,reject)=> {
      const pic = await axios.get(
    url,
    {
      responseType: "arraybuffer",
    }
  );
  const model = await nsfw.load("file://./functions/quant_nsfw_mobilenet/"); // To load a local model, nsfw.load('file://./path/to/model/')
  // Image must be in tf.tensor3d format
  // you can convert image to tf.tensor3d with tf.node.decodeImage(Uint8Array,channels)
  const image = await tf.node.decodeImage(pic.data, 3);
  const predictions = await model.classify(image);
  image.dispose(); // Tensor memory must be managed explicitly (it is not sufficient to let a tf.Tensor go out of scope for its memory to be released).
  return resolve (predictions);
  })

 }


module.exports = async function nsfw_filter(url){
 const prediction = await fn(url);
 console.log(prediction);
 let nsfw = 0;
 for(let i=0 ; i<prediction.length;i++){
  if (prediction[i].className == "Sexy" || prediction[i].className == "Porn" || prediction[i].className == "Hentai")
   nsfw += prediction[i].probability;
 }
 if (nsfw >= 0.7)
  return true
 else
  return false
}

