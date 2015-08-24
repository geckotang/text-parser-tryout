'use strict';

// npm modules
var kuromoji = require("kuromoji");
var Promise = require("bluebird");
var args = require('yargs').argv;
var input = args.t || "古池や蛙飛び込む水の音";


//
//カウンター
//
function Counter(max) {
  this.count = 0;
  this._readingstore = "";
  this.max = max;
};
Counter.prototype.reset = function() {
  this.count = 0;
  return this;
};
Counter.prototype.canAdd = function(reading) {
  if (!this.max) {
    return true;
  }
  if (this.max - ( this.count + this.calculateLength(reading) ) >= 0) {
    return true;
  } else {
    return false;
  }
};
Counter.prototype.add = function(reading) {
  this._readingstore += reading;
  this.count += this.calculateLength(reading);
  return this;
};
Counter.prototype.calculateLength = function (str) {
  var _str = str;
  _str = _str.replace(/[ぁ|ぃ|ぅ|ぇ|ぉ|ゃ|ゅ|ょ]/g, '');
  return _str.length;
};
Counter.prototype.get = function() {
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
      var first_counter = new Counter(5);
      var second_counter = new Counter(7);
      var third_counter = new Counter(5);
      var total = 0;

      parsedData.forEach(function(node){
        var currentSenryuPosition = 0;
        var currentTankaCounter = first_counter;
        var isLastPosition = false;
        //上の句
        if (first_counter.get() === 5) { 
          currentTankaCounter = second_counter;
        }
        //中の句
        if (second_counter.get() === 7) { 
          currentTankaCounter = third_counter;
        }
        //終了
        if (third_counter.get() === 5) {
          isLastPosition = true;
        }
        // 上/中/下最初の単語
        if (currentTankaCounter.get() === 0) {
          //最初の単語にふさわしく、単語が収まりきれば
          if (check_first_word(node) && currentTankaCounter.canAdd(node.reading)) {
            currentTankaCounter.add(node.reading);
          }
        } else {
          if (currentTankaCounter.canAdd(node.reading)) {
            currentTankaCounter.add(node.reading);
          }
        }
      });

      total = first_counter.get() + second_counter.get() + third_counter.get();

      console.log(
        first_counter,
        second_counter,
        third_counter
      );

      resolve({
        isSenryu : ( total === 17 ),
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
};


var senryu = new Senryu();
senryu.check(input).then(function(result){
  if (result.isSenryu) {
    console.log("「"+result.rawStr+"」は短歌です");
  } else {
    console.log("「"+result.rawStr+"」は短歌ではありません");
  }
});
