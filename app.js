'use strict';

// npm modules
var kuromoji = require("kuromoji");
var Promise = require("bluebird");
var args = require('yargs').argv;
var input = args.t || "古池や蛙飛び込む水の音";

//
// parse word with parser engine
//
function WordParser () {};

WordParser.prototype.parse = function (str) {
  return new Promise ( function (resolve, reject) {
    kuromoji.builder({ dicPath: "node_modules/kuromoji/dist/dict/" }).build(function (err, tokenizer) {
      var data = tokenizer.tokenize(str);
      resolve(data);
    });
  });
};


//
// judge tanka with word parser
//
function Senryu () {
  this.parser = new WordParser();
};

Senryu.prototype.parse = function (str, cb) {
  var that = this;
  return new Promise ( function (resolve, reject) {
    that.parser.parse(str).then(function(data){
      resolve(data);
    });
  });
};


Senryu.prototype.check = function (str, cb) {
  var that = this;
  return new Promise ( function (resolve, reject) {
    that.parse(str).then(function(parsedData){

      //ルールは http://swimath2.hatenablog.com/entry/2015/03/15/180240 を参照
      var tankaArray = ['','',''];
      var tankaMaxCountRule = [5, 7, 5];
      parsedData.forEach(function(node){
        var currentSenryuPosition = 0;
        var currentMaxCount = tankaMaxCountRule[currentSenryuPosition];
        var isLastPosition = false;
        var currentWords = '';
        //上の句
        if (tankaArray[0].length >= 5) { currentSenryuPosition = 1; }
        //中の句
        if (tankaArray[1].length >= 7) { currentSenryuPosition = 2; }
        //終了
        if (tankaArray[2].length >= 5) { isLastPosition = true; }

        currentMaxCount = tankaMaxCountRule[currentSenryuPosition];
        currentWords = tankaArray[currentSenryuPosition];

        // 上/中/下最初の単語
        if (currentWords.length === 0) {
          //最初の単語にふさわしく、単語が収まりきれば
          if (check_first_word(node) && check_capacity(currentMaxCount, currentWords, node)) {
            tankaArray[currentSenryuPosition] += node.reading;
          }
        } else {
          if (check_capacity(currentMaxCount, currentWords, node)) {
            tankaArray[currentSenryuPosition] += node.reading;
          }
        }
      });

      resolve({
        isSenryu : ( tankaArray.join('').length === 17 ),
        rawStr: str,
        parsedData: parsedData
      })
    });
  });

  //上/中/下の句の最初の単語にふさわしいか判断する
  function check_first_word(node) {
    if (/名詞|動詞|形容詞|形容動詞|副詞|連体詞|接続詞|感動詞|接頭詞|フィラー/.test(node.pos)) {
      return true;
    }
    if (/^![ぁ|ぃ|ぅ|ぇ|ぉ|っ|ゅ|ゃ|ょ]/.test(node.pos)) {
      return true;
    }
  }
  //上/中/下の句に収まりきるか判断する
  function check_capacity(max, box, node) {
    return max - (box.length - node.reading.length) > 0;
  }
};


var senryu = new Senryu();
senryu.check(input).then(function(result){
  if (result.isSenryu) {
    console.log("「"+result.rawStr+"」は短歌です");
  } else {
    console.log("「"+result.rawStr+"」は短歌ではありません");
  }
});
