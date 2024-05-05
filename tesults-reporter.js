// tesults-reporter.js
const mocha = require('mocha');
const fs = require('fs');
const path = require('path');
const tesults = require('tesults');
module.exports = tesultsReporter;

let data = {
  target: 'token',
  results: {
    cases: []
  },
  metadata: {
    integration_name: "mocha-tesults-reporter",
    integration_version: "1.3.0",
    test_framework: "mocha"
  }
};

let startTimes = {};

let args = {};
let disabled = false;

const targetKey = "tesults-target";
const filesKey = "tesults-files";
const configKey = "tesults-config";
const buildNameKey = "tesults-build-name";
const buildDescKey = "tesults-build-desc";
const buildResultKey = "tesults-build-result";
const buildReasonKey = "tesults-build-reason";


//const supplementalDataFile = "tesults-supplemental-data-file.json"

let supplementalData = {}

//const supplementalDataFile = "tesults-supplemental-data-file.json"

const getSupplementalData = () => {
    try {
        //let dataString = fs.readFileSync(supplementalDataFile, {encoding: 'utf8'})
        //return JSON.parse(dataString)
        return supplementalData
    } catch (err) {
        console.log("tesults-reporter error getting supplemental data: " + err)
        return {}
    }
}

const setSupplementalData = (data) => {
    try {
        //let fileContents = JSON.stringify(data)
        //fs.writeFileSync(supplementalDataFile, fileContents)
        supplementalData = data
    } catch (err) {
        console.log("tesults-reporter error saving supplemental data: " + err)
    }
}

function caseFiles (suite, name) {
  let files = [];
  if (args['tesults-files'] !== undefined) {
    try {
      const filesPath = path.join(args['tesults-files'], suite, name);
      fs.readdirSync(filesPath).forEach(function (file) {
        if (file !== ".DS_Store") { // Exclude os files
          files.push(path.join(filesPath, file));
        }
      });
    } catch (err) { 
      if (err.code === 'ENOENT') {
        // Normal scenario where no files present: console.log('Tesults error reading case files, check supplied tesults-files arg path is correct.');
      } else {
        console.log('Tesults error reading case files.')
      }
    }
  }
  return files;
}

function tesultsReporter(runner, options) {
  mocha.reporters.Base.call(this, runner);

  runner.on('start', function () {
    process.argv.forEach((val, index) => {
      if (val.indexOf(targetKey) === 0) {
        args[targetKey] = val.substr(targetKey.length + 1);
      }
      if (val.indexOf(filesKey) === 0) {
        args[filesKey] = val.substr(filesKey.length + 1);
      }
      if (val.indexOf(configKey) === 0) {
        args[configKey] = val.substr(configKey.length + 1);
      }
      if (val.indexOf(buildNameKey) === 0) {
        args[buildNameKey] = val.substr(buildNameKey.length + 1);
      }
      if (val.indexOf(buildDescKey) === 0) {
        args[buildDescKey] = val.substr(buildDescKey.length + 1);
      }
      if (val.indexOf(buildResultKey) === 0) {
        args[buildResultKey] = val.substr(buildResultKey.length + 1);
      }
      if (val.indexOf(buildReasonKey) === 0) {
        args[buildReasonKey] = val.substr(buildReasonKey.length + 1);
      }
    });

    if (options !== undefined && options !== null) {
        if (options.reporterOptions !== undefined && options.reporterOptions !== null) {
            if (args[targetKey] === undefined) {
                args[targetKey] = options.reporterOptions[targetKey];
            }
            if (args[filesKey] === undefined) {
                args[filesKey] = options.reporterOptions[filesKey];
            }
            if (args[configKey] === undefined) {
                args[configKey] = options.reporterOptions[configKey];
            }
            if (args[buildNameKey] === undefined) {
                args[buildNameKey] = options.reporterOptions[buildNameKey];
            }
            if (args[buildDescKey] === undefined) {
                args[buildDescKey] = options.reporterOptions[buildDescKey];
            }
            if (args[buildReasonKey] === undefined) {
                args[buildReasonKey] = options.reporterOptions[buildReasonKey];
            }
            if (args[buildResultKey] === undefined) {
                args[buildResultKey] = options.reporterOptions[buildResultKey];
            }
        }
    }

    if (args[targetKey] === undefined) {
      console.log(targetKey + " not provided. Tesults disabled.");
      disabled = true;
      return;
    }

    // Config file
    let config = undefined;
    if (args[configKey] !== undefined) {
      try {
        let raw = fs.readFileSync(args[configKey], "utf8");
        config = JSON.parse(raw);
      }
      catch (err) {
        config = undefined;
        if (err.code === 'ENOENT') {
          console.log('Tesults error reading config file, check supplied tesults-config arg path is correct. ' + args[configKey]);
        } else {
          console.log('Tesults error reading config file. ' + args[configKey])
        }
      }
    }
    if (config !== undefined) {
      if (config[args[targetKey]] !== undefined) {
        args[targetKey] = config[args[targetKey]];
      }
      if (args[filesKey] === undefined && config[filesKey] !== undefined) {
        args[filesKey] = config[filesKey];
      }
      if (args[buildNameKey] === undefined && config[buildNameKey] !== undefined) {
        args[buildNameKey] = config[buildNameKey];
      }
      if (args[buildDescKey] === undefined && config[buildDescKey] !== undefined) {
        args[buildDescKey] = config[buildDescKey];
      }
      if (args[buildReasonKey] === undefined && config[buildReasonKey] !== undefined) {
        args[buildReasonKey] = config[buildReasonKey];
      }
      if (args[buildResultKey] === undefined && config[buildResultKey] !== undefined) {
        args[buildResultKey] = config[buildResultKey];
      }
    }
  });

  runner.on('test', function(test) {
    if (disabled === true) {
      return;
    }
    startTimes[test.fullTitle()] = Date.now();
  });

  runner.on('test end', function(test) {
    if (disabled === true) {
      return;
    }
    let testCase = {};
    testCase.name = test.title;
    testCase.suite = test.parent.fullTitle();
    if (test.state === "passed") {
      testCase.result = "pass";
    } else if (test.state === "failed") {
      testCase.result = "fail";
      if (test.err !== undefined) {
        if (test.err.message !== undefined) {
          testCase.reason = test.err.message;
        } else {
          testCase.reason = test.err;
        }
        testCase["_Stack trace"] = test.err.stack;
      }
    } else {
      testCase.result = "unknown";
    }
    testCase.rawResult = test.state;
    let files = caseFiles(testCase.suite, testCase.name);
    if (files.length > 0) {
      testCase.files = files;
    }
    testCase.start = startTimes[test.fullTitle()];
    testCase.end = Date.now();

    // Add supplemental data
    try {
      const key = test.fullTitle()
      const supplemental = getSupplementalData()
      const data = supplemental[key]
      if (data !== undefined) {
        // files
        if (data.files !== undefined) {
            data.files = [...new Set(data.files)]
  
            if (testCase.files === undefined) {
                testCase.files = data.files
            } else {
                for (let f = 0; f < data.files.length; f++) {
                    testCase.files.push(data.files[f])
                }
            }
        }
        // desc
        testCase.desc = data.desc
        // steps
        if (data.steps !== undefined) {
            let cleaned_steps = []
            for (let s = 0; s < data.steps.length; s++) {
                let step = data.steps[s]
                if (cleaned_steps.length > 0) {
                    let last_step = cleaned_steps[cleaned_steps.length - 1]
                    if (step.name === last_step.name && step.result === last_step.result) {
                        // Do not add repeated step
                    } else {
                        cleaned_steps.push(step)
                    }
                } else {
                    cleaned_steps.push(step)
                }
            }
            testCase.steps = cleaned_steps
        }
        // custom
        Object.keys(data).forEach((key) => {
            if (key.startsWith("_")) {
                testCase[key] = data[key]
            }
        })
      }
    } catch (err) {
      // Swallow supplement data error
    }
    
    data.results.cases.push(testCase);
  });

  runner.on('end', function() {
    if (disabled === true) {
      return;
    }

    // build case
    if (args[buildNameKey] !== undefined) {
      let buildCase = {suite: "[build]"};
      buildCase.name = args[buildNameKey];
      if (buildCase.name === "") {
        buildCase.name = "-";
      }
      if (args[buildDescKey] !== undefined) {
        buildCase.desc = args[buildDescKey];
      }
      if (args[buildReasonKey] !== undefined) {
        buildCase.reason = args[buildReasonKey];
      }
      if (args[buildResultKey] !== undefined) {
        buildCase.result = args[buildResultKey].toLowerCase();
        if (buildCase.result !== "pass" && buildCase.result !== "fail") {
          buildCase.result = "unknown";
        }
      } else {
        buildCase.result = "unknown";
      }
      let files = caseFiles(buildCase.suite, buildCase.name);
      if (files.length > 0) {
        buildCase.files = files;
      }
      data.results.cases.push(buildCase);
    }

    // Tesults upload
    data.target = args[targetKey];
    console.log('Tesults results upload...');
    //console.log(JSON.stringify(data));
    tesults.results(data, function (err, response) {
      if (err) {
        console.log('Tesults library error, failed to upload.');
      } else {
        console.log('Success: ' + response.success);
        console.log('Message: ' + response.message);
        console.log('Warnings: ' + response.warnings.length);
        console.log('Errors: ' + response.errors.length);
      }
    });
  });
}

// To have this reporter "extend" a built-in reporter uncomment the following line:
// mocha.utils.inherits(MyReporter, mocha.reporters.Spec);

module.exports.file = (test, path) => {
  if (test === undefined) {
      return
  }

  let supplemental = getSupplementalData()
  const key = test.fullTitle()
  if (supplemental[key] === undefined) {
      supplemental[key] = { files: [path]}
  } else {
      let data = supplemental[key]
      if (data.files === undefined) {
          data.files = [path]
      } else {
          data.files.push(path)
      }
      supplemental[key] = data
  }
  setSupplementalData(supplemental)
}

module.exports.custom = (test, name, value) => {
  if (test === undefined) {
      return
  }

  let supplemental = getSupplementalData()
  const key = test.fullTitle()
  if (supplemental[key] === undefined) {
      supplemental[key] = {}
  }
  supplemental[key]["_" + name] = value
  setSupplementalData(supplemental)
}

module.exports.description = (test, value) => {
  if (test === undefined) {
      return
  }
  let supplemental = getSupplementalData()
  const key = test.fullTitle()
  if (supplemental[key] === undefined) {
      supplemental[key] = {}
  }
  supplemental[key]["desc"] = value
  setSupplementalData(supplemental)
}

module.exports.step =  (test, step) => {
  if (test === undefined || step === undefined) {
      return
  }
  if (step.description !== undefined) {
      step.desc = step.description
      delete step.description
  }
  let supplemental = getSupplementalData()
  const key = test.fullTitle()
  if (supplemental[key] === undefined) {
      supplemental[key] = { steps: [step] }
  } else {
      if (supplemental[key]["steps"] === undefined) {
          supplemental[key]["steps"] = [step]
      } else {
          let steps = supplemental[key]["steps"]
          steps.push(step)
          supplemental[key]["steps"] = steps
      }
  }
  setSupplementalData(supplemental)
}