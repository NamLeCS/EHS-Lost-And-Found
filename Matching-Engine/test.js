let report = {
    category: "electronics",
    brand: "apple",
    colors: ["black"],
    location: "library",
    description: "black airpods case"
};

let items = [
{
    category:"electronics",
    brand:"apple",
    colors:["black"],
    location:"library",
    description:"black airpods case with scratches"
},
{
    category:"electronics",
    brand:"samsung",
    colors:["white"],
    location:"cafeteria",
    description:"white earbuds"
}
];

console.log(match(report, items));