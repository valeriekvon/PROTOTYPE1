// Colors & constants
const COLORS = {
  blue: "#0E50C8",
  blueMid: "#1E56D9",
  white: "#FFFFFF",
  bg: "#FFFFFF",
  tagFill: "#225DDC",
};

// // Floating tag buttons (label → actual data tags)
// const TAGS = [
//   { label: "New York",   tags: ["People"]  },
//   { label: "Design",     tags: ["Process"] },
//   { label: "Exhibition", tags: ["Purpose"] },
//   { label: "Finance",    tags: ["Research"]},
//   { label: "Climate",    tags: ["Context"] },
//   { label: "Artistic practice",   tags: ["People"]  },
// ];
// NOTE: make it global so we can replace it after the sheet loads.
// window.TAGS = [
//   { label: "New York",   tags: ["People"]  },
//   { label: "Design",     tags: ["Process"] },
//   { label: "Exhibition", tags: ["Purpose"] },
//   { label: "Finance",    tags: ["Research"]},
//   { label: "Climate",    tags: ["Context"] },
// ];
window.TAGS_READY = false;

// Placeholder tags shown immediately on load — replaced once the sheet arrives
window.TAGS = [
  { label: "Design",   tags: ["design"] },
  { label: "People",   tags: ["people"] },
  { label: "Process",  tags: ["process"] },
  { label: "Context",  tags: ["context"] },
  { label: "Purpose",  tags: ["purpose"] },
  { label: "Research", tags: ["research"] },
  { label: "Strategy", tags: ["strategy"] },
  { label: "Identity", tags: ["identity"] },
  { label: "Brand",    tags: ["brand"] },
  { label: "Digital",  tags: ["digital"] },
  { label: "Space",    tags: ["space"] },
];
// const PROJECTS = [
//   // ——— EXHIBIT / CLIMATE CLUSTER ———
//   {
//     title: "Climate Exhibit Design",
//     tags: ["Context","Purpose","exhibit"],
//     info: { category: "Project", desc: "Designing an exhibition experience informed by climate context and clear purpose." },
//     children: [
//       { title: "Experience Map", tags: ["Process","exhibit"], info: { category: "Subnode", desc: "Visitor flow & touchpoints." } },
//       { title: "Narrative Goals", tags: ["Purpose","climate"], info: { category: "Subnode", desc: "Story spine & outcomes." } }
//     ]
//   },
//   {
//     title: "Community Climate Mission",
//     tags: ["Context","People","climate"],
//     info: { category: "Project", desc: "Mobilizing communities around climate objectives." },
//     children: [
//       { title: "Partner Network", tags: ["People","climate"], info: { category: "Subnode", desc: "NGOs & local orgs." } },
//       { title: "Campaign Brief", tags: ["Purpose","campaign"], info: { category: "Subnode", desc: "Why now, who, how." } }
//     ]
//   },
//   {
//     title: "Museum Installations Program",
//     tags: ["Process","Research","exhibit"],
//     info: { category: "Project", desc: "Rapidly prototyping museum exhibits with visitors." },
//     children: [
//       { title: "Floor Tests", tags: ["prototype","exhibit"], info: { category: "Subnode", desc: "On-site quick trials." } },
//       { title: "Visitor Interviews", tags: ["Research","people"], info: { category: "Subnode", desc: "Qual insights." } }
//     ]
//   },
//   {
//     title: "Climate Story Toolkit",
//     tags: ["Purpose","Research","climate"],
//     info: { category: "Project", desc: "Evidence-backed frames for climate communication." },
//     children: [
//       { title: "Frame Library", tags: ["Purpose","climate"], info: { category: "Subnode", desc: "Reusable narratives." } },
//       { title: "Evidence Notes", tags: ["Research"], info: { category: "Subnode", desc: "Citations & signals." } }
//     ]
//   },

//   // ——— CAMPAIGN / COMMUNITY CLUSTER ———
//   {
//     title: "Neighborhood Activation Campaign",
//     tags: ["Purpose","People","campaign"],
//     info: { category: "Project", desc: "Community-led activations to drive participation." },
//     children: [
//       { title: "Street Kit", tags: ["Process","campaign"], info: { category: "Subnode", desc: "Assets & playbook." } },
//       { title: "Ambassador Roster", tags: ["People"], info: { category: "Subnode", desc: "Local champions." } }
//     ]
//   },
//   {
//     title: "Civic Feedback Loop",
//     tags: ["Process","Research","campaign"],
//     info: { category: "Project", desc: "Closing the loop between outreach and policy." },
//     children: [
//       { title: "Feedback Board", tags: ["Process","ops"], info: { category: "Subnode", desc: "Collection & routing." } },
//       { title: "Signal Review", tags: ["Research"], info: { category: "Subnode", desc: "Weekly synthesis." } }
//     ]
//   },
//   {
//     title: "Audience Narrative Study",
//     tags: ["Purpose","Research","campaign"],
//     info: { category: "Project", desc: "Purpose-led narratives validated with audiences." },
//     children: [
//       { title: "Message Test", tags: ["Research"], info: { category: "Subnode", desc: "Qual/quant validation." } },
//       { title: "Story Frames", tags: ["Purpose"], info: { category: "Subnode", desc: "Frames that travel." } }
//     ]
//   },


// ];



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

      // Make the mobile TOP blue panel taller
       topBarRatio: mobile ? 0.44 : 0.18,                         // target ~62% screen height
       topBarMin:   260,                                          // never shorter than 260px
       topBarMax:   Math.round(windowHeight * 0.80),   

    zonePadX:    mobile ? 12 : 40,
    zonePadY:    mobile ? 90 : 120,
    zoneBottom:  mobile ? 140 : 160,

    playRadius:  mobile ? 28 : 36,
    playY:       (h) => Math.min(h - (mobile ? 60 : 80), h * 0.86),

    rCenter:     mobile ? 16 : 24,
    rNode:       mobile ? 14 : 24,
    rChild:      mobile ? 14 : 18,
    rTag:        mobile ? 14 : 20,

    repulseGraph: mobile ? 30000 : 60000,
    repulseTag:   mobile ? 10000 : 38000,
    damping:      mobile ? 0.5   : 0.86,
    linkRest:     mobile ? 200    : 350,
    childRest:    mobile ? 200    : 320,
    kick:         mobile ? 1.5    : 2.2,

    fontTitle:   mobile ? 22 : 24,
    fontBody:    mobile ? 12 : 13,
    fontNode:    mobile ? 14 : 20,
    fontCenter:  mobile ? 20 : 20,

    maxSelected: 3,
    zoneBottomDesktop: 0,   // try 80–110 on desktop
zoneBottomMobile:  0,  
imageFrameMode: 'horizontal',

  };
}




 