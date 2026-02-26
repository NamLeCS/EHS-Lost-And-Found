function match(report, items) {
    let fields = {
    "id": "string",
    "name": "string",
    "color": "string",
    "location": "string",
    "category": "string",
    "description": "string",
    "texture": "string",
    "size": "string",
    "material": "string",
    "weight": "string",
    }
    let possible = []
    let hasMatch = false
    for (let item of items) {
        if (report.includes(item)) {
            hasMatch = true;
            break;
        }
    }
    return possible
}