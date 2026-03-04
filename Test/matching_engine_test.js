const match = require('../Matching-Engine/matching_engine.js');

test('basic matching', () => {
    const report = {
        id: "001",
        name: "Blue Backpack",
        color: "blue",
        location: "library",
        category: "bag",
        description: "school backpack",
        texture: "canvas",
        size: "medium",
        material: "cloth",
        weight: "light",
        date: "2026-03-03"
    };

    const items = [
        {
            id: "002",
            name: "Blue Backpack",
            color: "blue",
            location: "library",
            category: "bag",
            description: "school backpack",
            texture: "canvas",
            size: "medium",
            material: "cloth",
            weight: "light",
            date: "2026-03-02"
        },
        {
            id: "003",
            name: "Red Backpack",
            color: "red",
            location: "library",
            category: "bag",
            description: "school backpack",
            texture: "canvas",
            size: "medium",
            material: "cloth",
            weight: "light",
            date: "2026-03-03"
        }
    ];

    const sortedItems = match(report, items);

    // Highest match should come first
    expect(sortedItems[0].id).toBe("002");
    expect(sortedItems[0].match_score).toBeGreaterThan(sortedItems[1].match_score);
});

