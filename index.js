const core = require('@actions/core');
const github = require('@actions/github');
const path = require("path");

const os = require('os');
const fs = require('fs');

const main = async () => 
{

    try{
        const productpath = core.getInput('productpath',{required: true});
        const projectdir = core.getInput('projectdir',{required: true});
        const suite  = core.getInput('suite',{required: true});
        const logformat  = core.getInput('logformat',{required: true});
        const userargs  = core.getInput('userargs',{required: false});
        const itercount  = core.getInput('itercount',{required: false});

        var iterations = ' ';
        var args = '';
        if (itercount) {
            iterations = ' -iterationCount ' + itercount;
        }
        if (userargs) {
            args = ' -args ' + userargs + ' ';
        }
        if (process.platform == 'linux') {
            script = 'cd ' + '"' + productpath + '/jdk/jre/bin/"' + '\n' + './java -jar "' + productpath + '/FunctionalTester/bin/hcl_ft.jar"'
            + ' -datastore ' + projectdir
            + ' -playback ' + suite
            + ' \"-rt.log_format\" ' + logformat
            + ' \"-rt.bring_up_logviewer\" false'
            + iterations
            + args;
        }
        else if (process.platform == 'win32') {
            script = 'cd ' + '"' + productpath + '\\jdk\\jre\\bin\\"' + '\n' + './java.exe -jar "' + productpath + '\\FunctionalTester\\bin\\hcl_ft.jar"'
            + ' -datastore ' + projectdir
            + ' -playback ' + suite
            + ' \"-rt.log_format\" ' + logformat
            + ' \"-rt.bring_up_logviewer\" false'
            + iterations
            + args;
        }

                let tempDir = os.tmpdir();
                let filePath = path.join(tempDir, suite + '.ps1');
                await fs.writeFileSync(
                        filePath,
                        script, 
                        { encoding: 'utf8' });
                
                console.log(script);
                console.log('========================== Starting Command Output ===========================');
                var spawn = require("child_process").spawn,child;
                child =  spawn("powershell.exe",[filePath]);
                child.stdout.on("data",function(data){
                    console.log(" " + data);
                });
                child.stderr.on("data",function(data){
                    console.log("Errors: " + data);
                    
                });
                child.on("exit",function(){
                    console.log("Powershell Script finished");
                    
                });
                await new Promise( (resolve) => {
                    child.on('close', resolve)
                });
                child.stdin.end();
                var fResultFile = tempDir + path.sep + "CommandLineLog.txt"; 
                if (fs.existsSync(fResultFile)) {
                    var verdictRegex = /--VERDICT=(INCONCLUSIVE|ERROR|PASS|FAIL).*/
                    var serverRegex = /--PUBLISH_URL=(.*)/;
                    var reportRegex = /--REPORT=(.*)[|]--URL=(.*)/;
                    var reports = {};
                    var isVerdictSet = false;
                    var verdict;
                    var reportSet = false;
                    var data = fs.readFileSync(fResultFile, 'utf-8').split('\n');
                              data.forEach(line => {
                                  if (!isVerdictSet && verdictRegex.test(line)) {
                                      var result = verdictRegex.exec(line);
                                      verdict = result[1];
                                      console.log("Test Result is: "+verdict);
                                      isVerdictSet = true;
                                      if(verdict=='ERROR' || verdict=='FAIL')
                                        {
                                        core.setFailed("Test Result is: FAIL");
                                        }
                                  }
                                  else if(reportRegex.test(line)){
                                      var reps = reportRegex.exec(line);
                                      reports[reps[1]] = reps[2];
                                      reportSet = true;
                                  }
                              });

                              if(!isVerdictSet){
                                  console.log("Test Result is: FAIL");
                                  core.setFailed("Test Result is: FAIL");
                               }
                          }
                          else {
                              console.log("Test Result is: FAIL");
                              core.setFailed("Test Result is: FAIL");
                          }
    }
    catch (error)
           {
              core.setFailed(error.message);
           }
}
main();
