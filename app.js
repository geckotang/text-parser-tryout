'use strict';

// npm modules
var kuromoji = require("kuromoji");
var Promise = require("bluebird");
var args = require('yargs').argv;
var input = args.t || "古池や蛙飛び込む水の音";


//
//カウンター
//
function WordCounter(max) {
  this.count = 0;
  this._readingstore = "";
  this.max = max;
};
WordCounter.prototype.reset = function() {
  this.count = 0;
  return this;
};
WordCounter.prototype.canAdd = function(node) {
  if (!this.max) {
    return true;
  }
  //最初の単語としてふさわしいかチェックする
  if (this.count === 0) {
    return this.canUseFirstWord(node)
  }
  //最大数を超えていないかチェックする
  return (this.max - ( this.count + this.calculateLength(node.reading) ) >= 0);
};
WordCounter.prototype.add = function(reading) {
  this._readingstore += reading;
  this.count += this.calculateLength(reading);
  return this;
};
WordCounter.prototype.calculateLength = function (str) {
  var _str = str;
  //小文字、記号は0文字カウントする
  if (!_str) {
    return 0;
  }
  _str = _str.replace(/[ぁぃぅぇぉゃゅょァィゥェォャュョ]/g, '');
  return _str.length;
};
WordCounter.prototype.canUseFirstWord = function (node) {
  if (/名詞|動詞|形容詞|形容動詞|副詞|連体詞|接続詞|感動詞|接頭詞|フィラー/.test(node.pos)) {
    return true;
  }
  if (/^![ぁぃぅぇぉっゃゅょァィゥェォッャュョ]/.test(node.reading)) {
    return true;
  }
};
WordCounter.prototype.get = function() {
  return this.count;
};

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
      var first_counter = new WordCounter(5);
      var second_counter = new WordCounter(7);
      var third_counter = new WordCounter(5);
      var total = 0;

      parsedData.forEach(function(node){
        var currentSenryuPosition = 0;
        var currentWordCounter = first_counter;
        var isLastPosition = false;
        //上の句
        if (first_counter.get() === 5) {
          currentWordCounter = second_counter;
        }
        //中の句
        if (second_counter.get() === 7) {
          currentWordCounter = third_counter;
        }
        //終了
        if (third_counter.get() === 5) {
          isLastPosition = true;
        }
        if (!node.reading) {
          node.reading = node.surface_form;
        }
        if (currentWordCounter.canAdd(node)) {
          currentWordCounter.add(node.reading);
        }
      });

      total = first_counter.get() + second_counter.get() + third_counter.get();

      //console.log( first_counter, second_counter, third_counter);

      resolve({
        isSenryu : ( total === 17 ),
        rawStr: str,
        parsedData: parsedData
      })
    });
  });
};


var senryu = new Senryu();
senryu.check(input).then(function(result){
  if (result.isSenryu) {
    console.log("「"+result.rawStr+"」は川柳です");
  } else {
    console.log("「"+result.rawStr+"」は川柳ではありません");
  }
});
