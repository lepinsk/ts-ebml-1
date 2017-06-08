
# ts-ebml
ebml encoder and decoder written in TypeScript.

# Fork of node-ebml
It is a fork of https://github.com/themasch/node-ebml

# install

```
npm install ts-ebml --save
```

# usage

## node

```ts
import * as ebml from 'ts-ebml';
const fs = require('fs');

const decoder = new ebml.Decoder();

fs.createReadStream('media/test.webm').on('data', (buf)=>{
  const ebmlElms = decoder.decode(buf);
  console.log(ebmlElms);
});
```

## browser

```ts
import * as ebml from 'ts-ebml';

const decoder = new ebml.Decoder();

fetch('media/test.webm')
  .then((res)=> res.arrayBuffer() )
  .then((buf)=>{
    const ebmlElms = decoder.decode(buf);
    console.log(ebmlElms);
  });
```

# features

* get WebP frame from MediaRecorder WebM VP8 Stream
* create seekable webm from media-recoder
* create playable webm to media-stream-api from media-recorder

see `src/test.ts` and `src/example_seekable.ts`

# stable API

```ts
class Decoder {
  constructor();
  decode(chunk: ArrayBuffer): EBMLElementDetail[];
}

class Encoder {
  constructor();
  encode(elms: EBMLElementBuffer[]): ArrayBuffer;
}

type EBMLElementBuffer = MasterElement | ChildElementBuffer;
type EBMLElementDetail = (MasterElement | ChildElementValue) & ElementDetail;

type MasterElement = {
  name: string;
  type: "m";
  isEnd: boolean;
  unknownSize?: boolean;
};
type ChildElementBuffer = {
  name: string;
  type: "u" | "i" | "f" | "s" | "8" | "b" | "d";
  data: Buffer;
};
type ChildElementValue = ChildElementBuffer & {
  value: number|string|Buffer;
};
type ElementDetail = {
  tagStart: number;
  tagEnd: number;
  sizeStart: number;
  sizeEnd: number;
  dataStart: number;
  dataEnd: number;
};
namespace tools {
  export function readVint(buffer: Buffer, start: number): null | ({length: number; value: number; });
  export function writeVint(val: number): Buffer;
  export function readBlock(buf: ArrayBuffer): EBML.SimpleBlock;
  export function convertEBMLDateToJSDate(int64str: string | Date): Date;
}
```

# develop

```sh
npm run setup # install cli tools
npm run init  # install libraries
npm run build # build js code
npm run lint  # tslint
npm run doc   # typedoc
npm run check # type check
npm run test  # build test
npm run example # build example
```

## debugging tools

* https://www.matroska.org/downloads/mkvalidator.html
* https://www.matroska.org/downloads/mkclean.html
* https://mkvtoolnix.download/doc/mkvinfo.html
* https://github.com/Matroska-Org/matroska-test-files
* `MOZ_LOG_FILE="log.txt" MOZ_LOG="MediaDemuxer:5" /Applications/FirefoxNightly.app/Contents/MacOS/firefox-bin`
* `MOZ_LOG_FILE="log.txt" MOZ_LOG="MediaDemuxer:5" /Applications/Firefox.app/Contents/MacOS/firefox-bin`
* chrome://media-internals/
* chrome://webrtc-internals/
* ./out/gn/Chromium.app/Contents/MacOS/Chromium  -vmodule="*video*=0,*ffmpeg*=1,*media*=1"  https://webrtc.github.io/samples/src/content/getusermedia/record/

# license

MIT


# related issues

## media recorder seekable webm

### chrome

* MediaRecorder output should have Cues element - https://bugs.chromium.org/p/chromium/issues/detail?id=561606
* Videos created with MediaRecorder API are not seekable / scrubbable - https://bugs.chromium.org/p/chromium/issues/detail?id=569840
* No duration or seeking cue for opus audio produced with mediarecoder - https://bugs.chromium.org/p/chromium/issues/detail?id=599134
* MediaRecorder: consider producing seekable WebM files - https://bugs.chromium.org/p/chromium/issues/detail?id=642012

### firefox

* Seeking in WebM files with no Cues element is not supported - https://bugzilla.mozilla.org/show_bug.cgi?id=657791
* Recorder video clips result can't replay /seekable on firefox - https://bugzilla.mozilla.org/show_bug.cgi?id=969290

## media recorder media source gap

### chrome

* MediaSource api not able to play webm video recorded from MediaRecorder - https://bugs.chromium.org/p/chromium/issues/detail?id=606000
* Video playback freezes using MediaSource API (MSE) - https://bugs.chromium.org/p/chromium/issues/detail?id=678269
* MediaSource API: Appending chunks to a SourceBuffer creates gaps and playback stops - https://bugs.chromium.org/p/chromium/issues/detail?id=688490
* Playback of video segments freezes with errors in media-internals - https://bugs.chromium.org/p/chromium/issues/detail?id=711829

## others

### chrome

* Regression: Playback of mediaStream recording shows blank video - https://bugs.chromium.org/p/chromium/issues/detail?id=657532

### firefox

* Webm video recorded with MediaRecorder cannot be played more than once - https://bugzilla.mozilla.org/show_bug.cgi?id=1272371


# related works

* https://github.com/antimatter15/js-ebml
* https://bitbucket.org/desmaj/libvpx.js/src/1ea3218282b6eb129061341831d23409dd539054/webm.js
* https://github.com/themasch/node-ebml
* https://github.com/oeuillot/node-matroska
* https://github.com/Matroska-Org/libebml/
* https://github.com/Matroska-Org/foundation-source
* https://github.com/webmproject/libwebm
* https://chromium.googlesource.com/webm/libvpx/+/master/third_party/libwebm
* https://github.com/mozilla/gecko-dev/tree/master/dom/media/webm

