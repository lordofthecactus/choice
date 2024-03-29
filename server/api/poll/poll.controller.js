'use strict';

var _ = require('lodash');
var Poll = require('./poll.model');
var Image = require('./image.model');
var crypto = require('crypto');

exports.signature = function(req, res) {
    Image.create({name: "test"}, function(err, img) {
      if(err) { return handleError(res, err); }
      var expiration = new Date();
      expiration.setHours(expiration.getHours() + 1);

      var policy = {
          expiration: expiration.toISOString(),
          conditions: [
              {bucket: "choicetheapp-assets"},
              ["starts-with", "$key", ""],
              {acl: "public-read"},
              ["starts-with", "$Content-Type", "image/"],
              ["content-length-range", 0, 1048576]
          ]
      };

      var awsKeyId = "AKIAJDKDAV3D3GPL3N7A";
      var awsKey = "YXBhNnBn65gW5w2v+0V/PKGUhapXU/YQysZ0541r";

      var policyString = JSON.stringify(policy);
      var encodedPolicyString = new Buffer(policyString).toString("base64");

      var hmac = crypto.createHmac("sha1", awsKey);
      hmac.update(encodedPolicyString);

      var digest = hmac.digest('base64');
      return res.json({awskeyid: awsKeyId, policy: encodedPolicyString, signature: digest, keyname: img._id + ".png"});
    });
};


// Get list of polls
exports.index = function(req, res) {
  Poll.find(function (err, polls) {
    if(err) { return handleError(res, err); }
    return res.json(200, polls);
  });
};

// Get a single poll
exports.show = function(req, res) {
  Poll.findById(req.params.id, function (err, poll) {
    if(err) { return handleError(res, err); }
    if(!poll) { return res.send(404); }
    return res.json(poll);
  });
};

// Creates a new poll in the DB.
exports.create = function(req, res) {
  Poll.create(req.body, function(err, poll) {
    if(err) { return handleError(res, err); }
    return res.json(201, poll);
  });
};

// Updates an existing poll in the DB.
exports.update = function(req, res) {
  if(req.body._id) { delete req.body._id; }
  Poll.findById(req.params.id, function (err, poll) {
    if (err) { return handleError(res, err); }
    if(!poll) { return res.send(404); }
    var updated = _.merge(poll, req.body);
    updated.save(function (err) {
      if (err) { return handleError(res, err); }
      return res.json(200, poll);
    });
  });
};

// Deletes a poll from the DB.
exports.destroy = function(req, res) {
  Poll.findById(req.params.id, function (err, poll) {
    if(err) { return handleError(res, err); }
    if(!poll) { return res.send(404); }
    poll.remove(function(err) {
      if(err) { return handleError(res, err); }
      return res.send(204);
    });
  });
};

// Votes yes on poll
exports.voteOption1 = function(req, res) {
  Poll.findById(req.params.id, function (err, poll) {
    if(err) { return handleError(res, err); }
    if(!poll) { return res.send(404); }
    if(poll.limitVotes <= poll.option1Count + poll.option2Count) { return res.status(403).send("vote limit"); }
    if(!poll.usersVoted){
      poll.usersVoted = [];
    }
    if(!req.body.user || !req.body.user.length){
      return res.status(403).send("user not specified");
    }
    if(poll.usersVoted.indexOf(req.body.user) >= 0) {
      return res.status(403).send("user already voted");
    } else {
      poll.option1Count += 1;
      poll.usersVoted.push(req.body.user);
      poll.save(function (err) {
        if (err) { return handleError(res, err); }
        return res.json(200, poll);
      });
    }

  });
}

// Votes no on poll
exports.voteOption2 = function(req, res) {
  Poll.findById(req.params.id, function (err, poll) {
    if(err) { return handleError(res, err); }
    if(!poll) { return res.send(404); }
    if(poll.limitVotes <= poll.option1Count + poll.option2Count) { return res.status(403).send("vote limit"); }
    if(!poll.usersVoted){
      poll.usersVoted = [];
    }
    if(!req.body.user || !req.body.user.length){
      return res.status(403).send("user not specified");
    }
    if(poll.usersVoted.indexOf(req.body.user) >= 0) {
      return res.status(403).send("user already voted");
    } else {
      poll.option2Count += 1;
      poll.usersVoted.push(req.body.user);
      poll.save(function (err) {
        if (err) { return handleError(res, err); }
        return res.json(200, poll);
      });
    }
  });
}

exports.myChoices = function(req, res) {
  if(!req.params.user_id || !req.params.user_id.length){
    return res.status(403).send("user not specified");
  }
  console.log(req.params.user_id);
  Poll.find({ 'user': req.params.user_id },function (err, polls) {
    console.log(polls);
    if(err) { return handleError(res, err); }
    return res.json(200, polls);
  });
}


function handleError(res, err) {
  return res.send(500, err);
}
