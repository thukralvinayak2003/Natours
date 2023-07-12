class APIfeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    //Building query
    //Filtering

    // eslint-disable-next-line node/no-unsupported-features/es-syntax
    const queryObj = { ...this.queryString };

    const excludeFields = ['page', 'sort', 'limit', 'fields'];
    excludeFields.forEach((el) => delete queryObj[el]);

    //ADVANCE FILTERING
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte?|lte?)\b/g, (match) => `$${match}`);
    this.query = this.query.find(JSON.parse(queryStr));

    return this; // new APIfeatures(Tour.find(), req.query) returns and object but .filter() doesnt return any object so we cant call sort() so we need to return an object
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' '); // it will return the values sepreated with spaces not comma separated
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }

    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }

    return this;
  }

  paginate() {
    const page = this.queryString.page * 1 || 1; // converts it into number and default is page no. 1
    const limit = this.queryString.limit || 100;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit); //limit means the amount of results that will be returned and skip means the number of results to be skipped

    return this;
  }

  //Building query
  //Filtering
  // const queryObj = { ...req.query }; // because req.query directly gives reference to the original object where as destructuring takes all the fields out from the req.query object and then with curly brackets we create a new object i.e a hard copy of the original object is made

  // const excludeFields = ['page', 'sort', 'limit', 'fields'];
  // excludeFields.forEach((el) => delete queryObj[el]); // it will delete all the page , sort , limit , fields from queryObj

  //ADVANCE FILTERING
  // let queryStr = JSON.stringify(queryObj); // { difficulty : 'easy , duration : {gte : 5}}
  // queryStr = queryStr.replace(/\b(gte?|lte?)\b/g, (match) => `$${match}`); // \b means exact same words /g means that it will happen multiple times else it will only replace the first occurence, here regular expression is used . The ? sign means that the previous character, in this case the 'e' letter could or not exists.

  // let query = Tour.find(JSON.parse(queryStr)); // If we dont put any arguments in find then it returns all documents in js document and req.query contains queries from url

  //SORTING

  // if (req.query.sort) {
  //   const sortBy = req.query.sort.split(',').join(' '); // it will return the values sepreated with spaces not comma separated
  //   query = query.sort(sortBy);
  // } else {
  //   query = query.sort('-createdAt');
  // }

  //LIMITING
  // if (req.query.fields) {
  //   const fields = req.query.fields.split(',').join(' ');
  //   query = query.select(fields);
  // } else {
  //   query = query.select('-__v');
  // }

  //PAGINATION
  // const page = req.query.page * 1 || 1; // converts it into number and default is page no. 1
  // const limit = req.query.limit || 100;
  // const skip = (page - 1) * limit;

  // query = query.skip(skip).limit(limit); //limit means the amount of results that will be returned and skip means the number of results to be skipped

  // if (req.query.page) {
  //   const numTours = await Tour.countDocuments();
  //   if (skip >= numTours) throw new Error('This page does not exist');
  // }
}

module.exports = APIfeatures;
