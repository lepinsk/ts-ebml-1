import {Int64BE} from "int64-buffer";
import * as EBML from "./EBML";

const Buffer: typeof global.Buffer = require("buffer/").Buffer;

const {byEbmlID}: {byEbmlID: { [key: number]: EBML.Schema } } = require("matroska/lib/schema");
const writeVint: (val: number)=> Buffer = require("ebml/lib/ebml/tools").writeVint;


interface DataTree {
  tagId: Buffer;
  elm: EBML.EBMLElementBuffer;
  children: DataTree[];
  data: Buffer | null;
}

export default class EBMLEncoder {
  private _buffers: Buffer[];
  private _stack: DataTree[];
  private _schema: {[key: number]: EBML.Schema};

  constructor(){
    this._schema = byEbmlID;
    this._buffers = [];
    this._stack = [];
  }

  encode(elms: EBML.EBMLElementBuffer[]): ArrayBuffer {
    return Buffer.concat(
      elms.reduce<Buffer[]>((lst, elm)=>
        lst.concat(this.encodeChunk(elm)), [])).buffer;
  }

  private encodeChunk(elm: EBML.EBMLElementBuffer): Buffer[] {
    if(elm.type === "m"){
      if(!elm.isEnd){
        this.startTag(elm);
      }else{
        this.endTag(elm);
      }
    }else{
      this.writeTag(elm);
    }
    return this.flush();
  }

  private flush(): Buffer[] {
    const ret = this._buffers;
    this._buffers = [];
    return ret;
  }

  private getSchemaInfo(tagName: string): Buffer | null {
    const tagNums = Object.keys(this._schema).map(Number);
    for (let i = 0; i < tagNums.length; i++) {
      let tagNum = tagNums[i];
      if (this._schema[tagNum].name === tagName) {
        return new Buffer(tagNum.toString(16), 'hex');
      }
    }
    return null;
  }

  /**
   * @param end - if end === false then length is unknown
   */
  private _encodeTag(tagId: Buffer, tagData: Buffer, unknownSize=false): Buffer {
    return Buffer.concat([
      tagId,
      unknownSize ?
        new Buffer('01ffffffffffffff', 'hex') : 
        writeVint(tagData.length),
      tagData
    ]);
  }

  private writeTag(elm: EBML.ChildElementBuffer) {
    const tagName = elm.name;
    const tagId = this.getSchemaInfo(tagName);

    const tagData = elm.data;

    if (tagId == null) {
      throw new Error('No schema entry found for ' + tagName);
    }

    const data = this._encodeTag(tagId, tagData);
    /**
     * 親要素が閉じタグあり(isEnd)なら閉じタグが来るまで待つ(children queに入る)
     */
    if(this._stack.length > 0) {
      const last = this._stack[this._stack.length - 1];
      last.children.push({
        tagId,
        elm,
        children: <DataTree[]>[],
        data
      });
      return;
    }
    this._buffers = this._buffers.concat(data);
    return;
  }

  private startTag(elm: EBML.MasterElement){
    const tagName = elm.name;
    const tagId = this.getSchemaInfo(tagName);
    if (tagId == null) {
      throw new Error('No schema entry found for ' + tagName);
    }

    /**
     * 閉じタグ不定長の場合はスタックに積まずに即時バッファに書き込む
     */
    if(elm.unknownSize){
      const data = this._encodeTag(tagId, new Buffer(0), elm.unknownSize);
      this._buffers = this._buffers.concat(data);
      return;
    }

    const tag: DataTree = {
      tagId,
      elm,
      children: <DataTree[]>[],
      data: null
    };

    if(this._stack.length > 0) {
        this._stack[this._stack.length - 1].children.push(tag);
    }
    this._stack.push(tag);
  }

  private endTag(elm: EBML.MasterElement){
    const tagName = elm.name;
    const tag = this._stack.pop();
    if(tag == null){ throw new Error("EBML structure is broken"); }
    if(tag.elm.name !== elm.name){ throw new Error("EBML structure is broken"); }

    const childTagDataBuffers = tag.children.reduce<Buffer[]>((lst, child)=>{
      if(child.data === null){ throw new Error("EBML structure is broken"); }
      return lst.concat(child.data);
    }, []);
    const childTagDataBuffer = Buffer.concat(childTagDataBuffers);
    if(tag.elm.type === "m"){
      tag.data = this._encodeTag(tag.tagId, childTagDataBuffer, tag.elm.unknownSize);  
    }else{
      tag.data = this._encodeTag(tag.tagId, childTagDataBuffer);
    }
  
    if (this._stack.length < 1) {
      this._buffers = this._buffers.concat(tag.data);
    }
  }

  static encodeValueToBuffer(elm: EBML.EBMLElementValue): EBML.EBMLElementBuffer {
    let data = new Buffer(0);
    if(elm.type === "m"){ return elm; }
    switch(elm.type){
      // 実際可変長 int なので 4byte 固定という設計は良くない
      case "u": data = new Buffer(4); data.writeUInt32BE(elm.value, 0); break;
      case "i": data = new Buffer(4); data.writeInt32BE(elm.value, 0); break;
      case "f": data = new Buffer(8); data.writeFloatBE(elm.value, 0); break; // 64bit
      case "s": data = new Buffer(elm.value, 'ascii'); break;
      case "8": data = new Buffer(elm.value, 'utf8'); break;
      case "b": data = elm.value; break;
      case "d": data = new Int64BE(elm.value).toBuffer(); break;
    }
    return Object.assign({}, elm, {data});
  }
}



