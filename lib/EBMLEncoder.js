"use strict";
var int64_buffer_1 = require("int64-buffer");
var Buffer = require("buffer/").Buffer;
var byEbmlID = require("matroska/lib/schema").byEbmlID;
var writeVint = require("ebml/lib/ebml/tools").writeVint;
var EBMLEncoder = (function () {
    function EBMLEncoder() {
        this._schema = byEbmlID;
        this._buffers = [];
        this._stack = [];
    }
    EBMLEncoder.prototype.encode = function (elms) {
        var _this = this;
        return Buffer.concat(elms.reduce(function (lst, elm) {
            return lst.concat(_this.encodeChunk(elm));
        }, [])).buffer;
    };
    EBMLEncoder.prototype.encodeChunk = function (elm) {
        if (elm.type === "m") {
            if (!elm.isEnd) {
                this.startTag(elm);
            }
            else {
                this.endTag(elm);
            }
        }
        else {
            this.writeTag(elm);
        }
        return this.flush();
    };
    EBMLEncoder.prototype.flush = function () {
        var ret = this._buffers;
        this._buffers = [];
        return ret;
    };
    EBMLEncoder.prototype.getSchemaInfo = function (tagName) {
        var tagNums = Object.keys(this._schema).map(Number);
        for (var i = 0; i < tagNums.length; i++) {
            var tagNum = tagNums[i];
            if (this._schema[tagNum].name === tagName) {
                return new Buffer(tagNum.toString(16), 'hex');
            }
        }
        return null;
    };
    /**
     * @param end - if end === false then length is unknown
     */
    EBMLEncoder.prototype._encodeTag = function (tagId, tagData, unknownSize) {
        if (unknownSize === void 0) { unknownSize = false; }
        return Buffer.concat([
            tagId,
            unknownSize ?
                new Buffer('01ffffffffffffff', 'hex') :
                writeVint(tagData.length),
            tagData
        ]);
    };
    EBMLEncoder.prototype.writeTag = function (elm) {
        var tagName = elm.name;
        var tagId = this.getSchemaInfo(tagName);
        var tagData = elm.data;
        if (tagId == null) {
            throw new Error('No schema entry found for ' + tagName);
        }
        var data = this._encodeTag(tagId, tagData);
        /**
         * 親要素が閉じタグあり(isEnd)なら閉じタグが来るまで待つ(children queに入る)
         */
        if (this._stack.length > 0) {
            var last = this._stack[this._stack.length - 1];
            last.children.push({
                tagId: tagId,
                elm: elm,
                children: [],
                data: data
            });
            return;
        }
        this._buffers = this._buffers.concat(data);
        return;
    };
    EBMLEncoder.prototype.startTag = function (elm) {
        var tagName = elm.name;
        var tagId = this.getSchemaInfo(tagName);
        if (tagId == null) {
            throw new Error('No schema entry found for ' + tagName);
        }
        /**
         * 閉じタグ不定長の場合はスタックに積まずに即時バッファに書き込む
         */
        if (elm.unknownSize) {
            var data = this._encodeTag(tagId, new Buffer(0), elm.unknownSize);
            this._buffers = this._buffers.concat(data);
            return;
        }
        var tag = {
            tagId: tagId,
            elm: elm,
            children: [],
            data: null
        };
        if (this._stack.length > 0) {
            this._stack[this._stack.length - 1].children.push(tag);
        }
        this._stack.push(tag);
    };
    EBMLEncoder.prototype.endTag = function (elm) {
        var tagName = elm.name;
        var tag = this._stack.pop();
        if (tag == null) {
            throw new Error("EBML structure is broken");
        }
        if (tag.elm.name !== elm.name) {
            throw new Error("EBML structure is broken");
        }
        var childTagDataBuffers = tag.children.reduce(function (lst, child) {
            if (child.data === null) {
                throw new Error("EBML structure is broken");
            }
            return lst.concat(child.data);
        }, []);
        var childTagDataBuffer = Buffer.concat(childTagDataBuffers);
        if (tag.elm.type === "m") {
            tag.data = this._encodeTag(tag.tagId, childTagDataBuffer, tag.elm.unknownSize);
        }
        else {
            tag.data = this._encodeTag(tag.tagId, childTagDataBuffer);
        }
        if (this._stack.length < 1) {
            this._buffers = this._buffers.concat(tag.data);
        }
    };
    EBMLEncoder.encodeValueToBuffer = function (elm) {
        var data = new Buffer(0);
        if (elm.type === "m") {
            return elm;
        }
        switch (elm.type) {
            // 実際可変長 int なので 4byte 固定という設計は良くない
            case "u":
                data = new Buffer(4);
                data.writeUInt32BE(elm.value, 0);
                break;
            case "i":
                data = new Buffer(4);
                data.writeInt32BE(elm.value, 0);
                break;
            case "f":
                data = new Buffer(8);
                data.writeFloatBE(elm.value, 0);
                break; // 64bit
            case "s":
                data = new Buffer(elm.value, 'ascii');
                break;
            case "8":
                data = new Buffer(elm.value, 'utf8');
                break;
            case "b":
                data = elm.value;
                break;
            case "d":
                data = new int64_buffer_1.Int64BE(elm.value).toBuffer();
                break;
        }
        return Object.assign({}, elm, { data: data });
    };
    return EBMLEncoder;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = EBMLEncoder;