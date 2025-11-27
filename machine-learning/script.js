const classNames = ['Half-Ripe', 'Nota_Mango', 'OverRipe', 'Ripe', 'Unripe'];
let model = null;
const MODEL_PATH = 'best.onnx';
const INPUT_SIZE = 640;
const CONF_THRESHOLD = 0.5;

async function loadModel() {
	model = await ort.InferenceSession.create(MODEL_PATH, {
		executionProviders: ['wasm']
	});
}

function preprocess(img) {
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	canvas.width = INPUT_SIZE;
	canvas.height = INPUT_SIZE;
	
	const scale = Math.min(INPUT_SIZE / img.width, INPUT_SIZE / img.height);
	const w = img.width * scale;
	const h = img.height * scale;
	const x = (INPUT_SIZE - w) / 2;
	const y = (INPUT_SIZE - h) / 2;
	
	ctx.fillStyle = '#000';
	ctx.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE);
	ctx.drawImage(img, x, y, w, h);
	
	const data = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE).data;
	const tensor = new Float32Array(3 * INPUT_SIZE * INPUT_SIZE);
	
	for (let i = 0; i < INPUT_SIZE * INPUT_SIZE; i++) {
		tensor[i] = data[i * 4] / 255.0;
		tensor[i + INPUT_SIZE * INPUT_SIZE] = data[i * 4 + 1] / 255.0;
		tensor[i + 2 * INPUT_SIZE * INPUT_SIZE] = data[i * 4 + 2] / 255.0;
	}
	
	return { tensor, scale, x, y, origW: img.width, origH: img.height };
}

function postprocess(output, scale, x, y, origW, origH) {
	const detections = [];
	const data = output.data;
	const dims = output.dims;
	
	if (dims.length === 3) {
		if (dims[1] === 84 || dims[1] === (4 + classNames.length)) {
			const numDets = dims[2];
			const numFeats = dims[1];
			
			for (let i = 0; i < numDets; i++) {
				const x_center_norm = data[i];
				const y_center_norm = data[numDets + i];
				const width_norm = data[2 * numDets + i];
				const height_norm = data[3 * numDets + i];
				
				let maxConf = 0;
				let maxClass = 0;
				for (let j = 0; j < numFeats - 4; j++) {
					const conf = data[(4 + j) * numDets + i];
					if (conf > maxConf) {
						maxConf = conf;
						maxClass = j;
					}
				}
				
				if (maxConf > CONF_THRESHOLD) {
					const x_center = x_center_norm * INPUT_SIZE;
					const y_center = y_center_norm * INPUT_SIZE;
					const width = width_norm * INPUT_SIZE;
					const height = height_norm * INPUT_SIZE;
					const boxX = (x_center - width / 2 - x) / scale;
					const boxY = (y_center - height / 2 - y) / scale;
					
					detections.push({
						x: Math.max(0, boxX),
						y: Math.max(0, boxY),
						w: width / scale,
						h: height / scale,
						conf: maxConf,
						cls: maxClass
					});
				}
			}
		} else if (dims[2] === 6) {
			const numDets = dims[1];
			for (let i = 0; i < numDets; i++) {
				const idx = i * 6;
				const conf = data[idx + 4];
				if (conf > CONF_THRESHOLD) {
					const x_center = data[idx] * INPUT_SIZE;
					const y_center = data[idx + 1] * INPUT_SIZE;
					const width = data[idx + 2] * INPUT_SIZE;
					const height = data[idx + 3] * INPUT_SIZE;
					const cls = Math.round(data[idx + 5]);
					
					detections.push({
						x: Math.max(0, (x_center - width / 2 - x) / scale),
						y: Math.max(0, (y_center - height / 2 - y) / scale),
						w: width / scale,
						h: height / scale,
						conf: conf,
						cls: cls
					});
				}
			}
		}
	}
	
	detections.sort((a, b) => b.conf - a.conf);
	const filtered = [];
	for (const det of detections) {
		let overlap = false;
		for (const existing of filtered) {
			const x1 = Math.max(det.x, existing.x);
			const y1 = Math.max(det.y, existing.y);
			const x2 = Math.min(det.x + det.w, existing.x + existing.w);
			const y2 = Math.min(det.y + det.h, existing.y + existing.h);
			if (x2 > x1 && y2 > y1) {
				const inter = (x2 - x1) * (y2 - y1);
				const area1 = det.w * det.h;
				const area2 = existing.w * existing.h;
				const iou = inter / (area1 + area2 - inter);
				if (iou > 0.5) {
					overlap = true;
					break;
				}
			}
		}
		if (!overlap) filtered.push(det);
	}
	
	return filtered;
}

function filterDetections(detections) {
	if (detections.length === 0) return detections;
	const hasOtherClasses = detections.some(det => det.cls !== 1);
	if (hasOtherClasses) {
		return detections.filter(det => det.cls !== 1);
	}
	return detections;
}

function draw(canvas, detections, imgW, imgH) {
	const ctx = canvas.getContext('2d');
	canvas.width = imgW;
	canvas.height = imgH;
	ctx.clearRect(0, 0, imgW, imgH);
	
	detections.forEach(det => {
		const x = Math.max(0, Math.min(det.x, imgW));
		const y = Math.max(0, Math.min(det.y, imgH));
		const w = Math.max(1, Math.min(det.w, imgW - x));
		const h = Math.max(1, Math.min(det.h, imgH - y));
		const label = classNames[det.cls] + ' ' + (det.conf * 100).toFixed(1) + '%';
		
		ctx.font = '16px Arial';
		ctx.strokeStyle = '#FF0000';
		ctx.lineWidth = 3;
		ctx.strokeRect(x, y, w, h);
		ctx.fillStyle = '#FF0000';
		ctx.fillRect(x, y - 20, ctx.measureText(label).width + 10, 20);
		ctx.fillStyle = '#FFFFFF';
		ctx.fillText(label, x + 5, y - 5);
	});
}

document.getElementById('fileInput').addEventListener('change', async (e) => {
	const file = e.target.files[0];
	if (!file) return;
	
	document.getElementById('result').innerHTML = '';
	document.getElementById('detections').innerHTML = '';
	
	const img = new Image();
	img.onload = async () => {
		const { tensor, scale, x, y, origW, origH } = preprocess(img);
		const inputTensor = new ort.Tensor('float32', tensor, [1, 3, INPUT_SIZE, INPUT_SIZE]);
		const results = await model.run({ [model.inputNames[0]]: inputTensor });
		const output = results[model.outputNames[0]];
		const detections = postprocess(output, scale, x, y, origW, origH);
		const filteredDetections = filterDetections(detections);
		
		const detectionsDiv = document.getElementById('detections');
		if (filteredDetections.length > 0) {
			let html = '<h3>Hasil Deteksi:</h3><ul>';
			filteredDetections.forEach(det => {
				html += '<li>' + classNames[det.cls] + ' - ' + (det.conf * 100).toFixed(1) + '%</li>';
			});
			html += '</ul><p>Total: ' + filteredDetections.length + ' objek</p>';
			detectionsDiv.innerHTML = html;
		} else {
			detectionsDiv.innerHTML = '<p>Tidak ada objek terdeteksi</p>';
		}
		
		const div = document.createElement('div');
		const displayImg = document.createElement('img');
		displayImg.src = img.src;
		displayImg.style.width = (origW > 500 ? 500 : origW) + 'px';
		displayImg.style.height = 'auto';
		
		const canvas = document.createElement('canvas');
		canvas.style.width = displayImg.style.width;
		
		div.appendChild(displayImg);
		div.appendChild(canvas);
		document.getElementById('result').appendChild(div);
		
		const drawDetections = () => {
			const imgWidth = displayImg.offsetWidth;
			const imgHeight = displayImg.offsetHeight;
			const s = imgWidth / origW;
			
			const scaled = filteredDetections.map(d => ({
				...d,
				x: d.x * s,
				y: d.y * s,
				w: d.w * s,
				h: d.h * s
			}));
			
			canvas.height = imgHeight;
			draw(canvas, scaled, imgWidth, imgHeight);
		};
		
		if (displayImg.complete) {
			drawDetections();
		} else {
			displayImg.onload = drawDetections;
		}
	};
	img.src = URL.createObjectURL(file);
});

loadModel();