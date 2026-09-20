import {NATURAL_UNDERSTANDING_CASES} from "./evals/natural-understanding-cases.js";
import {evaluateNaturalCases} from "./src/natural/eval-runner.js";

const report=evaluateNaturalCases(NATURAL_UNDERSTANDING_CASES),failed=report.results.filter(x=>!x.ok);
console.log(JSON.stringify({passed:report.passed,total:report.total,failed:report.failed,categories:report.categories,failures:failed.slice(0,20).map(x=>({id:x.id,input:x.input,errors:x.errors}))},null,2));
if(report.failed)process.exitCode=1;
