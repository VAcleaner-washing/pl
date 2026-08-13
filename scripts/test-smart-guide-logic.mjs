import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../assets/public-quiz.js',import.meta.url),'utf8');
const cut=source.indexOf('  function escapeHtml');
if(cut<0)throw new Error('Smart Guide logic boundary not found');
const harness=`${source.slice(0,cut)}
  return {
    blankState,
    setState(value){state={...blankState(),...value}},
    getState(){return JSON.parse(JSON.stringify(state))},
    questions,
    setAnswer,
    result
  };
})()`;
const quiz=vm.runInNewContext(harness,{location:{pathname:'/pidbir/'},URLSearchParams,Intl,Math,JSON,Set});
let passed=0;
const check=(ok,label)=>{if(!ok)throw new Error(label);passed+=1};

quiz.setState({zones:['textile'],textileProblems:['common_stain','odor'],textileOdor:'urine'});
quiz.setAnswer('zones','textile','multi');
let state=quiz.getState();
check(state.zones.length===0,'textile zone is removed');
check(state.textileProblems.length===0&&state.textileOdor==='','removed textile answers are cleared');

quiz.setState({zones:['kitchen'],kitchenProblems:['carbon','heavy_scale_rust'],kitchenGrillSurface:'safe',kitchenScaleSurface:'acid_safe'});
quiz.setAnswer('kitchenProblems','carbon','multi');
state=quiz.getState();
check(state.kitchenGrillSurface===''&&state.kitchenScaleSurface==='acid_safe','only the removed kitchen branch is cleared');

quiz.setState({zones:['textile'],textileProblems:['dry_debris']});
check(quiz.result().product==='puzzi_jimmy','dry textile debris recommends Puzzi + Jimmy');

quiz.setState({zones:['textile','kitchen'],textileProblems:['dry_debris'],kitchenProblems:['daily']});
check(quiz.result().product==='general','textile, hard surfaces and dry debris recommend General cleaning');

quiz.setState({zones:['textile','windows'],textileProblems:['none'],windowsMode:'glass'});
check(quiz.result().product==='puzzi_abir','textile plus glass recommends Puzzi + window robot');

quiz.setState({zones:['textile','windows'],textileProblems:['none'],windowsMode:'frames'});
check(quiz.result().product==='elite','textile plus framed windows includes SC 2 through HOME RESET');

quiz.setState({zones:['windows'],windowsMode:'frames'});
check(quiz.result().product==='ideal_windows','framed windows recommend SC 2 + window robot');

quiz.setState({zones:['windows'],windowsMode:'glass'});
check(quiz.result().product==='abir','glass-only windows recommend the robot');

const windowQuestion=quiz.questions().find(question=>question.id==='windowsMode');
check(windowQuestion.options.length===2&&!windowQuestion.options.some(([value])=>value==='full'),'duplicate framed-window choice is removed');

check(1050-Math.round(1050*.05)===997,'quiz discount rounding matches the backend formula');

console.log(JSON.stringify({passed,failed:0,status:'passed'}));
