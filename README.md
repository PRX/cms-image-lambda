# CMS Image Lambda

[![codecov](https://codecov.io/gh/PRX/cms-image-lambda/branch/master/graph/badge.svg)](https://codecov.io/gh/PRX/cms-image-lambda)

## Description

Lambda worker to process/validate/create-thumbnails for [cms.prx.org](https://github.com/PRX/cms.prx.org) image uploads.

Triggered via SNS notifications (see [Announce](https://github.com/PRX/announce)), the lambda will:

#### On `create` or `update`

1. Download the `upload_path` for the image object (from S3 or just HTTP)
2. Run [sharp](https://www.npmjs.com/package/sharp) `metadata()` against the image to verify it's an image and get the size/type/etc.
3. Copy the original image to a destination S3 bucket/path (`public/piece_images/1234/filename.jpg`)
4. Create thumbnails for the image in the destination bucket/path (`public/piece_images/1234/filename_small.jpg`)
5. Send success/failure/invalid messages back to CMS via SQS ([Shoryuken](https://github.com/phstc/shoryuken)), including some additional identify data about the image size/type/etc.

#### On `delete`

1. Verify that the image exists in the destination S3 bucket/path.  (Non-existent images are ignored).
2. Create a `deleted.json` file in the destination bucket/path, containing the last known HAL representation of the image before there record was deleted.  This is a TEMPORARY measure, as CMS hard-deletes images, but we don't really want to remove the files yet.

### Callbacks

SQS callbacks contain the following JSON data:

| Key    | Description |
| ------ | ----------- |
| id     | ID of the Image that triggered this job
| type   | Subclass of Image ("piece_images", "series_images", etc)
| path   | Destination path in S3 the files were copied to
| name   | Original file name
| width  | Width of the original image
| height | Height of the original image
| size   | Size of the file in bytes
| format | Detected image format ("jpeg", "png", etc)
| downloaded | Boolean if the image download succeeded
| valid      | Boolean if `sharp` recognized the image file
| resized    | Boolean if resizing/uploading to S3 destination succeeded
| error      | String if any error occurred in the above 3 states

After successfully resizing, there will be 4 files in the destination path:

- `s3://${bucket}/${path}/original_name.jpg`
- `s3://${bucket}/${path}/original_name_square.jpg` (75x75 px thumbnail)
- `s3://${bucket}/${path}/original_name_small.jpg` (120px best-fit resize)
- `s3://${bucket}/${path}/original_name_medium.jpg` (240px best-fit resize)

Note that only `create` and `update` calls get an SQS callback.  Deletes are
processed without calling back to CMS.

# Installation

To get started, first run an `yarn install`.  Or if you're using Docker, then
`docker-compose build`.

## Tests

You do need a writeable S3 bucket and SQS to run the full test suite. The test/dev
values for these are already set in the `env-example`, so you really just need
some local AWS credentials (usually in `~/.aws/credentials`) that are able to
access these resources.

```
cp env-example .env
yarn
yarn test
yarn run watch
```

Another option is to use Docker (in which case you'll have to provide some AWS
credentials to the docker container itself, via ENV variables):

```
cp env-example .env
echo AWS_ACCESS_KEY_ID=some-access-key >> .env
echo AWS_SECRET_ACCESS_KEY=some-secret >> .env
echo AWS_DEFAULT_REGION=us-east-1 >> .env

docker-compose build
docker-compose run test
```

## Deploying

Deploying is handled by the PRX [Infrastructure](https://github.com/PRX/Infrastructure) repo,
using CloudFormation.  Internally, this will run the `yarn run build` command to
zip the lambda code and upload it to S3.

# License

[MIT License](http://opensource.org/licenses/MIT)
