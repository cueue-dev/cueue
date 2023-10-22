export async function stream2buffer(stream: ReadableStream, size: number): Promise<ArrayBuffer> {
	const result = new Uint8Array(size);
	const reader = stream.getReader();

	let bytes_read = 0;
	while (true) {
		const { done, value } = await reader.read();
		if (done) {
			break;
		}
		result.set(value, bytes_read);
		bytes_read += value.length;
	}

	return result.buffer;
}
