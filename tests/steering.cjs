const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=n=>fs.readFileSync(path.join(__dirname,'../source/js',n),'utf8');
const car=read('30_car_d_main.js').split('\nBUILD.push(')[0];
const ctx=vm.createContext({assert});
vm.runInContext(`const GOL_META={axf:1.25,track:1.49,wheelR:.278};
${read('00_math.js')}
const models=new Map(),previous=new Map();
const objModel=i=>{if(!models.has(i))models.set(i,m4ident(m4()));return models.get(i)};
const objPrev=i=>{if(!previous.has(i))previous.set(i,m4ident(m4()));return previous.get(i)};
${car}
CAR.slotBody=0;CAR.slotWheel=[1,2,3,4];CAR.slotSteer=5;
m4rotZ(CAR.steerMat,-18*PI/180);
const body=m4ident(m4()),zeros=new Float32Array(4);
CAR.inp[0]=0;CAR.inp[1]=0;CAR.place(body,zeros,zeros);
const neutral=objModel(5)[6];
CAR.inp[0]= .04;CAR.inp[1]= .04*14;CAR.place(body,zeros,zeros);
assert(objModel(5)[6]>neutral,'steering-wheel top moves toward the right for right steering');
assert(objModel(2)[2]>0,'front-right wheel steers toward the right');
CAR.inp[0]= -.04;CAR.inp[1]= -.04*14;CAR.place(body,zeros,zeros);
assert(objModel(5)[6]<neutral,'steering-wheel top moves toward the left for left steering');
assert(objModel(2)[2]<0,'front-right wheel steers toward the left');
CAR.inp[1]=0;CAR.place(body,zeros,zeros);assert(Math.abs(objModel(5)[6]-neutral)<1e-6);
`,ctx);
console.log('PASS: steering wheel and front wheels turn in the same direction, left/right/center.');
