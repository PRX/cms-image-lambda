# cms-image-lambda

[![Build Status](https://snap-ci.com/PRX/cms-image-lambda/branch/master/build_image)](https://snap-ci.com/PRX/cms-image-lambda/branch/master)

## Description

Lambda worker to process/validate/create-thumbnails for [cms.prx.org](https://github.com/PRX/cms.prx.org) image uploads.

Triggered via SNS notifications (see [Announce](https://github.com/PRX/announce)), the lambda will:

1. Download the `upload_path` for the image object (from S3 or just HTTP)
2. Run ImageMagick `identify` against the image to verify it's an image and gather other metadata
3. Copy the original image to a destination S3 bucket/path (`public/piece_images/1234/filename.jpg`)
4. Create thumbnails for the image in the destination bucket/path (`public/piece_images/1234/filename_small.jpg`)
5. Send success/failure/invalid messages back to CMS via SQS ([Shoryuken](https://github.com/phstc/shoryuken))

## Developing

Make sure you have AWS credentials locally (usually in `~/.aws/credentials`) that are able to access
the `TEST_BUCKET` and `DESTINATION_BUCKET` defined in `config/test.env`.  Then, just...

```
npm install
npm test # or npm run watch
```

## Deploying

Deployment to AWS is handled by [node-lambda](https://www.npmjs.com/package/node-lambda).  Before deploying,
you'll need to `cp env-example .env`.  Really all you need to fill in is the `AWS_ROLE_ARN` - which is an IAM
role you've setup with the correct permissions to (1) run lambda, (2) read from your `upload_path` S3 bucket(s),
and (3) write to you `DESTINATION_BUCKET`.

```
npm run deploy-dev
npm run deploy-staging
npm run deploy-prod
```

Then just run the correct command from `package.json` to deploy to your environment.  This will automatically
give the lambda the correct name, as well as injecting any secret dotenv variables (from the config directory)
into the run environment.
