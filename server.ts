const pgPromise = require('pg-promise');
const R = require('ramda');
const request = require('request-promise');

// Limit the amount of debugging of SQL expressions
const trimLogsSize: number = 200;

// Database interface
interface DBOptions {
  host: string
  , database: string
  , user?: string
  , password?: string
  , port?: number
};

// Actual database options
const options: DBOptions = {
  user: 'postgres',
  password: 'fenil68',
  host: 'localhost',
  database: 'lovelystay_test',
};

console.info('Connecting to the database:',
  `${options.user}@${options.host}:${options.port}/${options.database}`);

const pgpDefaultConfig = {
  promiseLib: require('bluebird'),
  // Log all querys
  query(query) {
    console.log('[SQL   ]', R.take(trimLogsSize, query.query));
  },
  // On error, please show me the SQL
  error(err, e) {
    if (e.query) {
      console.error('[SQL   ]', R.take(trimLogsSize, e.query), err);
    }
  }
};


const pgp = pgPromise(pgpDefaultConfig);
const db = pgp(options);

//User interface
interface User {
  id: number,
  login: string,
  name: string,
  company: string,
  location: string
}



class GitHubUsers {

  constructor(param: string, options: any) {
    if (param == 'name') {
      this.createUser(options);
    } else {
      this.getUsers(param, options);
    }
  }

  createUser(option) {

    db.none('CREATE TABLE IF NOT EXISTS github_users (id BIGSERIAL, login TEXT, name TEXT, company TEXT, location TEXT, CONSTRAINT uc_github_users UNIQUE (id, login, name))')
      .then(() => request({
        uri: 'https://api.github.com/users/' + option + '',
        headers: {
          'User-Agent': 'Request-Promise'
        },
        json: true
      }))
      .then((data: User) => db.one(
        'INSERT INTO github_users(login,name,company,location)  SELECT $[login], $[name], $[company],$[location] WHERE NOT EXISTS ( SELECT 1 FROM github_users WHERE login=$[login])   RETURNING id ', data)
      ).then(({ id }) => console.log(id))
      .then(() => process.exit(0));
  }

  getUsers(param, options) {

    if (param == 'stats') {

      db.any('SELECT location,COUNT (id) FROM github_users GROUP BY location').then(
        (data: any) => data.forEach(element => {
          console.info('Location:' + element.location + '  Total Users :' + element.count)
        })
      )

    } else {
      db.any('SELECT * FROM github_users WHERE location = $1', options).then(
        (data: User[]) => data.forEach(element => {
          let i: number = 0; i++;
          console.info(i + ':' + element.login)
        })
      )
    }

  }
}

if (process.argv[2] != null) {

  let args = process.argv[2].split("=");
  let argsOptions = args[0];
  let Option = args[1];
  new GitHubUsers(argsOptions, Option);

}else{
  console.info("Please provide right argumet  ex. npm test name=desaipiyush68,  npm test location=lisbon, npm test stats");
}





