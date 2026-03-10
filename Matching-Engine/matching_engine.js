function match(report, items) {
    let fields = ["id", "name", "color", "location", "category", "texture", "size", "material", "weight", "date"];
    for (let item of items) {
        let match_score = 0;
        for (let index = 0; index < fields.length; index++) {
            let field = fields[index];
            if (report[field] === item[field] && report[field] !== undefined && item[field] !== undefined) {
                match_score += 1;
            }
        }
        item.match_score = match_score;
    }
    let sorted_items = items.sort((a, b) => b.match_score - a.match_score);
    return sorted_items;
}

/* TASKS
- receives report (with fields) and list of items (with fields for each item)
- compares report fields with item fields
- calculates a match score for each item based on how many fields match
- returns a list of items sorted by match score (highest first)

PSEUDOCODE
function match(report, items) {
    for item in items:
        match_score = 0
        for index in range(len(report)):
            if report[index] == item[index]:
                match_score += 1
        item.match_score = match_score
    sorted_items = sort items by match_score in descending order
    return sorted_items
}

*/