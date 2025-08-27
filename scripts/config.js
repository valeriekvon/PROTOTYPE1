// Colors & constants
const COLORS = {
    blue: "#0E50C8",
    blueMid: "#1E56D9",
    white: "#FFFFFF",
    bg: "#FFFFFF",
    tagFill: "#225DDC",
  };
  
  // Floating tag buttons (label → actual data tags)
  const TAGS = [
    { label: "New York",   tags: ["People"]  },
    { label: "Design",     tags: ["Process"] },
    { label: "Exhibition", tags: ["Purpose"] },
    { label: "Finance",    tags: ["Research"]},
    { label: "Climate",    tags: ["Context"] },
  ];
  
  // Project dataset
  const PROJECTS = [
    { title: "Climate change", tags: ["People","Purpose","brand repositioning","campaign","social"], children:[
      { title: "Campaign A", tags:["campaign"] },
      { title: "New York",   tags:["branding"] }
    ], info: { desc: "A multi-year initiative connecting people to action on climate.", category: "Project", tools:"Workshops, Social, Campaign"} },
    { title: "Social housing", tags: ["Research","Context","campaign","social"], children:[
      { title:"Social Drops", tags:["social"] }
    ], info: { desc: "Research-led proposals for accessible housing models.", category: "Project", tools:"Research, Policy, Mapping"} },
    { title: "Social cause", tags: ["Purpose","Process"], children:[
      { title:"Retail Pilot", tags:["retail"] }
    ], info: { desc: "Brand platform to activate a social mission at scale.", category: "Project", tools:"Brand, Content"} },
    { title: "Specific time", tags: ["Process","People"], children:[
      { title:"Prototype 1", tags:["innovation"] },
      { title:"Prototype 2", tags:["innovation"] }
    ], info: { desc: "Rapid prototyping to validate ideas with real users.", category: "Project", tools:"Prototyping, Testing"} },
    { title: "Context", tags: ["Research","Context"], children:[
      { title:"Market Scan", tags:["research"] }
    ], info: { desc: "Context analysis and market scan for opportunities.", category: "Project", tools:"Research, Analysis"} },
    { title: "Stay Home", tags: ["Process","Research"], children:[
      { title:"Exhibit", tags:["exhibition"] }
    ], info: { desc: "Cultural exhibition exploring life at home.", category: "Project", tools:"Exhibition, Curation"} },
  ];
  
  const TAG_COLORS = {
    People: "#7C4DFF",
    Process: "#00BCD4",
    Purpose: "#00C853",
    Research: "#FFAB00",
    Context: "#FF5252",
    campaign: "#E91E63",
    social: "#2196F3",
    branding: "#9C27B0",
    "brand repositioning": "#8BC34A",
    retail: "#795548",
    innovation: "#00ACC1",
    exhibition: "#6D4C41",
    research: "#5D4037",
  };
  
  // Responsive UI config
  let UI = null;
  
  function isMobileViewport() {
    const shortSide = Math.min(windowWidth, windowHeight);
    return shortSide <= 640;
  }
  
  function getUIConfig() {
    const mobile = isMobileViewport();
    return {
      baseWidth:  mobile ? 360 : 1200,
      baseHeight: mobile ? 640 : 680,
  
      topBarRatio: mobile ? 0.24 : 0.18,
      topBarMin:   110,
      topBarMax:   240,
  
      :    mobile ? 12 : 40,
      zonePadY:    mobile ? 90 : 120,
      zoneBottom:  mobile ? 140 : 160,
  
      playRadius:  mobile ? 28 : 36,
      playY:       (h) => Math.min(h - (mobile ? 60 : 80), h * 0.86),
  
      rCenter:     mobile ? 14 : 16,
      rNode:       mobile ? 16 : 18,
      rChild:      mobile ? 12 : 12,
      rTag:        mobile ? 16 : 18,
  
      repulseGraph: mobile ? 52000 : 60000,
      repulseTag:   mobile ? 32000 : 38000,
      damping:      mobile ? 0.88   : 0.86,
      linkRest:     mobile ? 130    : 150,
      childRest:    mobile ? 100    : 120,
      kick:         mobile ? 1.8    : 2.2,
  
      fontTitle:   mobile ? 16 : 18,
      fontBody:    mobile ? 12 : 13,
      fontNode:    mobile ? 12 : 12,
      fontCenter:  mobile ? 13 : 14,
  
      maxSelected: 3,
    };
  }
  