function match(report, items) {
    // Defines the fields to compare between the report and the items
    let fields = [
        "category", 
        "brand", 
        "colors",  
        "location",  
        "time"];
    // Iterates through each item and calculates the match score based on the number of matching fields
    for (let item of items) {
        let match_score = 0;

        for (let field of fields) {
            if (item[field] === undefined || report[field] === undefined) {
                continue;
            }
            if (field === "colors") {
                for (let color of report.colors) {
                    if (item.colors.includes(color)) {
                        match_score++;
                        break;
                    }
                }

            } else { if ( report[field].toLowerCase() === item[field].toLowerCase()) {
                        match_score++;
            }
        }
        }
        item.match_score = match_score;

        item.match_score += descriptionMatch(report, item);
    }
    // Sorts the items by match score in descending order and returns the sorted list
    let sorted_items = items.sort((a, b) => b.match_score - a.match_score);
    return sorted_items;
}
function descriptionMatch(report, item) {
    // Processes the description fields of the report and item by converting to lowercase, removing stop words, and splitting into words
    if (!report.description || !item.description) {
        return 0;
    }

    let stop_words = ["the", "is", "in", "and", "to", "of"];

    let processed_report = report.description.toLowerCase().replace(/[.,!?]/g, "").split(" ").filter(word => !stop_words.includes(word));;
    let processed_item = item.description.toLowerCase().replace(/[.,!?]/g, "").split(" ").filter(word => !stop_words.includes(word));
    let match_score = 0;

    // Compares the processed words in the report description with the processed words in the item description and increments the match score for each matching word
    for (let word of processed_report) {
        if (processed_item.includes(word)) {
            match_score++;
        }    }
    return match_score;
}
/* TASKS
- receives report (with fields) and list of items (with fields for each item)
- compares report fields with item fields
- calculates a match score for each item based on how many fields match
- returns a list of items sorted by match score (highest first)
- check description by
    - converting it to lowercase
    - removing punctuation
    - splitting into words
    - removing small words (stop words)
    - comparing the words in the report description with the words in the item description
    - incrementing the match score for each matching word

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