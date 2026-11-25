/**
 * Generates assets/img/hero-office-depth.png from the homepage hero photo with
 * Depth Anything V2 (Apache-2.0), run locally via transformers.js.
 * Setup: npm i @huggingface/transformers, then download
 * onnx-community/depth-anything-v2-base (config.json, preprocessor_config.json,
 * onnx/model.onnx) into tools/models/. Then: node make-depth.mjs <photo> <out.png>
 * and downscale the result to about 560 px wide.
 */
import { env, pipeline, RawImage } from "@huggingface/transformers";
env.allowRemoteModels = false;
env.localModelPath = new URL("./models/", import.meta.url).pathname;
const [src, out] = process.argv.slice(2);
const est = await pipeline("depth-estimation", "onnx-community/depth-anything-v2-base", { dtype: "fp32" });
const img = await RawImage.read(src);
const { depth } = await est(img);
await depth.save(out);
console.log("depth", depth.width, depth.height);
