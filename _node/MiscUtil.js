export class MiscUtil {
	static getDot (object, dotPath) {
		const path = dotPath.split(".");
		if (object == null) return null;
		for (let i = 0; i < path.length; ++i) {
			object = object[path[i]];
			if (object == null) return object;
		}
		return object;
	}

	static setDot (object, dotPath, val) {
		if (object == null) return object;

		const path = dotPath.split(".");

		const len = path.length;
		for (let i = 0; i < len; ++i) {
			const pathPart = path[i];
			if (i === len - 1) object[pathPart] = val;
			else object = (object[pathPart] = object[pathPart] || {});
		}

		return val;
	}

	static deleteDot (object, dotPath) {
		const path = dotPath.split(".");
		if (object == null) return object;
		for (let i = 0; i < path.length - 1; ++i) {
			object = object[path[i]];
			if (object == null) return object;
		}
		return delete object[path.at(-1)];
	}

	static getKeyPaths (obj) {
		const out = [];

		const recurse = (obj, stack) => {
			if (obj == null) return out.push(stack.join("."));

			if (typeof obj === "object") {
				if (obj instanceof Array) throw new Error("Unimplemented!");

				Object.entries(obj)
					.forEach(([k, v]) => {
						stack.push(k);
						recurse(v, stack);
						stack.pop();
					});

				return;
			}

			out.push(stack.join("."));
		};

		recurse(obj, []);

		return out;
	}
}
