const path = require("path");
const { v4: uuidv4 } = require('uuid')

// Load the SDK for JavaScript
var AWS = require('aws-sdk');
// Set the Region 
AWS.config.update({ region: 'eu-central-1' });

AWS.config.loadFromPath("./config/config.json");

module.exports = {

    uploadFile: function (fields, files) {

    return new Promise((resolve, reject) => {

        // Create S3 service object
        const s3 = new AWS.S3({ apiVersion: '2006-03-01' });
        const uploadParams = { Bucket: "digit-u-ireveal-resources", Key: '', Body: '' };
        var fs = require('fs');
        var fileStream = fs.createReadStream(files.file.path);
        fileStream.on('error', function (err) {
            console.log('File Error', err);
        });

        uploadParams.Body = fileStream;
        uploadParams.Key = path.basename(uuidv4() + "." + path.basename(files.file.name).split('.')[1]);
        uploadParams.ACL = 'public-read';
        uploadParams.ContentType = files.file.type;

        // call S3 to retrieve upload file to specified bucket
        s3.upload(uploadParams, function (err, data) {
            if (err) {
                console.log(err)
                return reject({
                    status: false,
                    data: err,
                    message: "ERROR.UPLOAD"
                })
            } if (data) {
                console.log("data :",data);
                if (fields.type === 'cover') {
                    return resolve({
                        type: "cover", message: "upload done", url: data.Location, file_name: uploadParams.Key,
                    })
                }
                if (fields.type === 'profil') {
                    return resolve({
                        type: "profil", message: "upload done", url: data.Location, file_name: uploadParams.Key,
                    })
                }
            }
        });
    })

}


}