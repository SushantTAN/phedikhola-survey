export const text={
 en:{home:"Home",citizens:"Citizens",sync:"Sync",settings:"Settings",newCitizen:"Add citizen",newService:"Add service record",pending:"Pending",synced:"Synced",failed:"Failed",conflict:"Conflict",fullName:"Full name",phone:"Phone",age:"Age",gender:"Gender",saveOffline:"Save offline",captureLocation:"Capture location",takePhoto:"Take photo",serviceWard:"Service ward",healthProblems:"Health problems",medicines:"Medicines",quantity:"Quantity"},
 ne:{home:"गृह",citizens:"नागरिक",sync:"सिंक",settings:"सेटिङ",newCitizen:"नागरिक थप्नुहोस्",newService:"सेवा विवरण थप्नुहोस्",pending:"सिंक बाँकी",synced:"सिंक भयो",failed:"असफल",conflict:"द्वन्द्व",fullName:"पूरा नाम",phone:"फोन नं.",age:"उमेर",gender:"लिङ्ग",saveOffline:"अफलाइन सुरक्षित गर्नुहोस्",captureLocation:"लोकेसन लिनुहोस्",takePhoto:"फोटो खिच्नुहोस्",serviceWard:"सेवा दिएको वडा",healthProblems:"स्वास्थ्य समस्या",medicines:"औषधी",quantity:"मात्रा"}
};
export type Lang=keyof typeof text;
let current:Lang="ne";
export const t=(key:keyof typeof text.en)=>text[current][key];
export const setLanguage=(lang:Lang)=>{current=lang;};
export const getLanguage=()=>current;
