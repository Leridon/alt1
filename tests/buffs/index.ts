import * as a1lib from "alt1/base";
import { webpackImages, ImgRefData } from "alt1/base";
import * as OCR from "alt1/ocr";
import BuffReader, { Buff } from "alt1/buffs";

globalThis.OCR = OCR;
globalThis.ImageDetect = a1lib.ImageDetect;
globalThis.a1lib = a1lib;

let tests = webpackImages({
	// small1: import("./imgs/small1.data.png"),
	fixed_bg: import("./imgs/fixed_bg.data.png"),
});


export default async function run() {
	await tests.promise;
	for (let testid in tests.raw) {
		console.log(`==== ${testid} ====`);


		let fullimg: ImageData = tests[testid];
		let splitline = fullimg.height / 2 | 0;
		let firstimg = new ImgRefData(fullimg.clone({ x: 0, y: 0, width: fullimg.width, height: splitline }));
		let secondimg = new ImgRefData(fullimg.clone({ x: 0, y: splitline, width: fullimg.width, height: fullimg.height - splitline }));
		firstimg.toData().show(0, 0);
		secondimg.toData().show(0, splitline + 10);
		let t = performance.now();
		let reader = new BuffReader();
		reader.debuffs = false;
		let pos = reader.find(firstimg);

		console.log(performance.now() - t, pos);

		if (!pos) {
			console.log("couldn't find pos " + testid);
			continue;
		}

		t = performance.now();
		// do two reads to allow it to do a slow grow
		reader.find(firstimg);
		reader.read(firstimg.toData());
		let buffs1 = reader.read(firstimg.toData())!;
		let reads = buffs1.map(buff => {
			return {
				buff1: buff,
				buff2: null as any,
				counts: null as any,
			};
		});

		reader.find(secondimg);
		reader.read(secondimg.toData());
		let buffs2 = reader.read(secondimg.toData())!;
		for (let read of reads) {
			let bestcounts: ReturnType<Buff["countMatch"]> | null = null;
			let best: Buff | null = null;
			for (let buff of buffs2) {
				let matched = read.buff1.countMatch(buff.buffer);
				if (!bestcounts ? matched.passed > 20 : matched.passed > bestcounts.passed) {
					bestcounts = matched;
					best = buff;
				}
			}
			if (best) {
				read.buff2 = best;
				read.counts = bestcounts;
			}
		}

		ImageData.prototype.show.maxImages = 1000;
		for (let read of reads) {
			read.buff1.buffer.show(10, 300 + 30 * reads.indexOf(read));
			if (read.buff2) {
				read.buff2.buffer.show(40, 300 + 30 * reads.indexOf(read));
			}
		}

		console.log(reads);
		console.log(performance.now() - t);

		globalThis.reader = reader;
	}
}