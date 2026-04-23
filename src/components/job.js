import React, { useEffect, useState } from "react";

const user = JSON.parse(localStorage.getItem("user") || "{}");

const TYPE_COLOR = {
  Government: { color:"#60a5fa", bg:"rgba(10, 10, 11, 0.12)", border:"rgba(37,99,235,0.3)" },
  Private:    { color:"#4ade80", bg:"rgba(34,197,94,0.1)",  border:"rgba(34,197,94,0.3)"  },
  Internship: { color:"#f59e0b", bg:"rgba(245,158,11,0.12)",border:"rgba(245,158,11,0.3)" },
  Defence:    { color:"#a78bfa", bg:"rgba(139,92,246,0.12)",border:"rgba(139,92,246,0.3)" },
  PSU:        { color:"#34d399", bg:"rgba(52,211,153,0.1)", border:"rgba(52,211,153,0.3)"  },
};

export const JOBS = [
  // ── GOVERNMENT / UPSC ──────────────────────────────────────────────────────
  { id:1,  title:"UPSC Civil Services (IAS/IPS/IFS) 2025",  org:"Union Public Service Commission",  type:"Government", edu:"Graduate+",  location:"All India",        salary:"₹56,100–2,50,000/mo", deadline:"20 May 2025",  vacancies:1105,  category:"UPSC",    logo:"🏅",
    tags:["IAS","IPS","IFS","UPSC","CSE"], skills:["GK","Polity","History","Geography","Essay","CSAT"],
    applyLink:"https://upsconline.nic.in", notifLink:"https://upsc.gov.in/examinations/civil-services-examination",
    books:["NCERT 6–12 All Subjects","Indian Polity — M. Laxmikanth","Modern Indian History — Bipin Chandra","Indian Economy — Ramesh Singh","Certificate Physical & Human Geography — G.C. Leong"],
    youtube:["https://youtube.com/results?search_query=UPSC+2025+free+coaching","https://www.youtube.com/@StudyIQ","https://www.youtube.com/@UnacademyIAS"],
    recruiterId:"r3", recruiterName:"UPSC Foundation", recruiterUsername:"upscfoundation22" },

  { id:2,  title:"SSC CGL (Combined Graduate Level) 2025",  org:"Staff Selection Commission",        type:"Government", edu:"Graduate",   location:"All India",        salary:"₹25,500–81,100/mo",  deadline:"28 Apr 2025",  vacancies:17727, category:"SSC",     logo:"📋",
    tags:["SSC","CGL","Govt","Income Tax","Audit"], skills:["Reasoning","Quant","English","GK"],
    applyLink:"https://ssc.nic.in", notifLink:"https://ssc.nic.in/Portal/Notifications",
    books:["Quantitative Aptitude — R.S. Aggarwal","English Grammar — Wren & Martin","Lucent GK","Word Power Made Easy — Norman Lewis"],
    youtube:["https://youtube.com/results?search_query=SSC+CGL+2025+free","https://www.youtube.com/@Adda247"],
    recruiterId:null, recruiterName:"SSC Official", recruiterUsername:null },

  { id:3,  title:"SSC CHSL (10+2 Level) 2025",              org:"Staff Selection Commission",        type:"Government", edu:"12th Pass",  location:"All India",        salary:"₹19,900–63,200/mo",  deadline:"10 May 2025",  vacancies:3712,  category:"SSC",     logo:"📄",
    tags:["SSC","CHSL","12th Pass","Clerk","LDC"], skills:["Reasoning","Maths","English","GK"],
    applyLink:"https://ssc.nic.in", notifLink:"https://ssc.nic.in/Portal/Notifications",
    books:["Kiran SSC CHSL","Fast Track Arithmetic — Rajesh Verma","Arihant SSC CHSL"],
    youtube:["https://youtube.com/results?search_query=SSC+CHSL+2025"],
    recruiterId:null, recruiterName:"SSC Official", recruiterUsername:null },

  { id:4,  title:"SBI Probationary Officer (PO) 2025",      org:"State Bank of India",               type:"Government", edu:"Graduate",   location:"All India",        salary:"₹36,000–63,840/mo",  deadline:"15 Apr 2025",  vacancies:2000,  category:"Banking", logo:"🏛️",
    tags:["SBI","PO","Banking","Finance","JMGS"], skills:["Reasoning","English","Quant","Banking Awareness","Computer"],
    applyLink:"https://sbi.co.in/careers", notifLink:"https://bank.sbi/web/careers",
    books:["Banking Awareness — Arihant","Objective English — S.P. Bakshi","SBI PO Previous Papers — Kiran"],
    youtube:["https://youtube.com/results?search_query=SBI+PO+2025+preparation","https://www.youtube.com/@bankersadda"],
    recruiterId:"r4", recruiterName:"SBI HR Division", recruiterUsername:"sbihrdivision99" },

  { id:5,  title:"IBPS PO (Probationary Officer) 2025",     org:"IBPS",                              type:"Government", edu:"Graduate",   location:"All India",        salary:"₹23,700–42,020/mo",  deadline:"10 Apr 2025",  vacancies:4455,  category:"Banking", logo:"💰",
    tags:["IBPS","PO","Banking","MT"], skills:["Reasoning","English","Quant","Banking","Computer"],
    applyLink:"https://ibps.in", notifLink:"https://www.ibps.in",
    books:["IBPS PO Guide — Disha","Banking Awareness — S.L. Gulati","Computer Knowledge — Arihant"],
    youtube:["https://youtube.com/results?search_query=IBPS+PO+2025"],
    recruiterId:null, recruiterName:"IBPS Official", recruiterUsername:null, releasedAt:"2026-04-22T09:30:00.000Z" },

  { id:6,  title:"RRB NTPC Graduate Posts 2025",            org:"Railway Recruitment Board",         type:"Government", edu:"Graduate",   location:"All India",        salary:"₹19,900–35,400/mo",  deadline:"01 May 2025",  vacancies:11558, category:"Railway", logo:"🚆",
    tags:["Railway","NTPC","RRB","Station Master","Goods Guard"], skills:["Maths","GK","Reasoning","English"],
    applyLink:"https://rrbcdg.gov.in", notifLink:"https://indianrailways.gov.in",
    books:["RRB NTPC — Arihant","Lucent General Science","RRB Previous Papers — Kiran"],
    youtube:["https://youtube.com/results?search_query=RRB+NTPC+2025+preparation"],
    recruiterId:null, recruiterName:"RRB Official", recruiterUsername:null },

  { id:7,  title:"RRB Group D (Level 1) 2025",              org:"Railway Recruitment Board",         type:"Government", edu:"10th Pass",  location:"All India",        salary:"₹18,000–22,000/mo",  deadline:"15 May 2025",  vacancies:103769,category:"Railway", logo:"🚂",
    tags:["Railway","Group D","10th","Track Man","Helper"], skills:["Maths","GK","Reasoning","Science"],
    applyLink:"https://rrbapply.gov.in", notifLink:"https://indianrailways.gov.in",
    books:["RRB Group D — Arihant","Railway GK Digest","Maths Magic Series"],
    youtube:["https://youtube.com/results?search_query=RRB+Group+D+2025"],
    recruiterId:null, recruiterName:"RRB Official", recruiterUsername:null },

  { id:8,  title:"IBPS Clerk (CWE) 2025",                   org:"IBPS",                              type:"Government", edu:"Graduate",   location:"All India",        salary:"₹11,765–31,540/mo",  deadline:"20 Apr 2025",  vacancies:6128,  category:"Banking", logo:"🏦",
    tags:["IBPS","Clerk","Banking","12th+","Office Assistant"], skills:["Reasoning","Maths","English","Banking","Computer"],
    applyLink:"https://ibps.in", notifLink:"https://www.ibps.in",
    books:["IBPS Clerk Guide — Disha","Banking Awareness","Fast Track Arithmetic"],
    youtube:["https://youtube.com/results?search_query=IBPS+Clerk+2025"],
    recruiterId:null, recruiterName:"IBPS Official", recruiterUsername:null },

  { id:9,  title:"NDA (National Defence Academy) 2025",     org:"UPSC",                              type:"Defence",    edu:"12th Pass",  location:"All India",        salary:"₹15,600–39,100/mo",  deadline:"18 Mar 2025",  vacancies:406,   category:"Defence", logo:"🎖️",
    tags:["NDA","Army","Navy","Air Force","Defence"], skills:["Maths","English","GK","Physics","Chemistry"],
    applyLink:"https://upsconline.nic.in", notifLink:"https://upsc.gov.in/examinations/nda-na-examination",
    books:["NDA/NA Mathematics — Arihant","NDA Pathfinder — Arihant","Physics NCERT 11–12"],
    youtube:["https://youtube.com/results?search_query=NDA+2025+preparation"],
    recruiterId:null, recruiterName:"UPSC NDA", recruiterUsername:null },

  { id:10, title:"DRDO Scientist B 2025",                   org:"Defence R&D Organisation",          type:"Defence",    edu:"B.Tech/BE",  location:"All India",        salary:"₹56,100–1,77,500/mo",deadline:"20 Apr 2025",  vacancies:185,   category:"Defence", logo:"🛡️",
    tags:["DRDO","Scientist","Defence","Research","Engineering"], skills:["Engineering","Research","Science","Mathematics"],
    applyLink:"https://rac.gov.in", notifLink:"https://rac.gov.in/recruitment",
    books:["Gate Previous Papers","Engineering Maths — B.S. Grewal","Network Analysis — Van Valkenburg"],
    youtube:["https://youtube.com/results?search_query=DRDO+Scientist+B+2025"],
    recruiterId:null, recruiterName:"DRDO Recruitment", recruiterUsername:null },

  { id:11, title:"IBPS RRB Officer Scale I 2025",           org:"IBPS",                              type:"Government", edu:"Graduate",   location:"Rural Areas",      salary:"₹15,000–19,000/mo",  deadline:"05 Apr 2025",  vacancies:8922,  category:"Banking", logo:"🌾",
    tags:["IBPS","RRB","Rural Bank","Officer","Agriculture"], skills:["Reasoning","Quant","Hindi","English","Banking"],
    applyLink:"https://ibps.in", notifLink:"https://www.ibps.in",
    books:["IBPS RRB Guide — Disha","Rural Banking Awareness","Kisan Credit Cards"],
    youtube:["https://youtube.com/results?search_query=IBPS+RRB+2025"],
    recruiterId:null, recruiterName:"IBPS Official", recruiterUsername:null },

  { id:12, title:"NABARD Grade A Officer 2025",             org:"NABARD",                            type:"PSU",        edu:"Graduate",   location:"All India",        salary:"₹44,500–89,150/mo",  deadline:"25 Apr 2025",  vacancies:155,   category:"Banking", logo:"🌱",
    tags:["NABARD","Grade A","Agriculture","Development","RBI"], skills:["Economics","Agriculture","Reasoning","English"],
    applyLink:"https://nabard.org", notifLink:"https://www.nabard.org/content.aspx?id=590",
    books:["NABARD Grade A Guide — Disha","Agricultural Finance","Indian Economy — Ramesh Singh"],
    youtube:["https://youtube.com/results?search_query=NABARD+Grade+A+2025"],
    recruiterId:null, recruiterName:"NABARD Official", recruiterUsername:null },

  { id:13, title:"RBI Grade B Officer 2025",                org:"Reserve Bank of India",             type:"PSU",        edu:"Graduate",   location:"All India",        salary:"₹55,000–1,08,500/mo",deadline:"30 Mar 2025",  vacancies:291,   category:"Banking", logo:"🏧",
    tags:["RBI","Grade B","Officer","Monetary Policy","Finance"], skills:["Economics","Finance","English","Reasoning","GK"],
    applyLink:"https://rbi.org.in/careers", notifLink:"https://www.rbi.org.in/careers",
    books:["RBI Grade B Guide — Disha","Indian Economy — Ramesh Singh","Economic Survey 2024-25"],
    youtube:["https://youtube.com/results?search_query=RBI+Grade+B+2025"],
    recruiterId:null, recruiterName:"RBI Official", recruiterUsername:null },

  { id:14, title:"GATE 2025 (Engineering/Science)",         org:"IIT Kanpur (for PSUs/M.Tech)",      type:"Government", edu:"B.Tech/B.Sc",location:"All India",        salary:"Varies (PSU + M.Tech)",deadline:"01 Feb 2025",  vacancies:99999, category:"GATE",    logo:"🔬",
    tags:["GATE","IIT","PSU","M.Tech","Engineering","BHEL","ONGC"], skills:["Core Engineering","Maths","Aptitude"],
    applyLink:"https://gate2025.iitk.ac.in", notifLink:"https://gate2025.iitk.ac.in",
    books:["GATE Previous Papers","Made Easy Topic-wise Notes","Engineering Maths — B.S. Grewal"],
    youtube:["https://youtube.com/results?search_query=GATE+2025+preparation","https://www.youtube.com/@GateLectures"],
    recruiterId:null, recruiterName:"GATE Organizer", recruiterUsername:null },

  { id:15, title:"SSC JE (Junior Engineer) 2025",           org:"Staff Selection Commission",        type:"Government", edu:"Diploma/BE", location:"All India",        salary:"₹35,400–1,12,400/mo",deadline:"05 May 2025",  vacancies:1765,  category:"SSC",     logo:"⚙️",
    tags:["SSC","JE","Civil","Electrical","Mechanical","Diploma"], skills:["Civil/Electrical/Mechanical Engineering","Reasoning","GK"],
    applyLink:"https://ssc.nic.in", notifLink:"https://ssc.nic.in/Portal/Notifications",
    books:["SSC JE Civil Engineering — Made Easy","SSC JE Electrical — R.K. Rajput","Kiran SSC JE Previous Papers"],
    youtube:["https://youtube.com/results?search_query=SSC+JE+2025"],
    recruiterId:null, recruiterName:"SSC Official", recruiterUsername:null },

  { id:16, title:"ISRO Scientist/Engineer SC 2025",         org:"ISRO",                              type:"PSU",        edu:"B.Tech/BE",  location:"Bangalore/Various",salary:"₹56,100–1,77,500/mo",deadline:"15 Apr 2025",  vacancies:320,   category:"PSU",     logo:"🚀",
    tags:["ISRO","Scientist","Space","Electronics","CSE","Mechanical"], skills:["Engineering","Physics","Mathematics","Computer"],
    applyLink:"https://isro.gov.in/careers.html", notifLink:"https://www.isro.gov.in",
    books:["ISRO Previous Papers — Disha","Digital Electronics — Morris Mano","C Programming — Kanetkar"],
    youtube:["https://youtube.com/results?search_query=ISRO+scientist+engineer+2025"],
    recruiterId:null, recruiterName:"ISRO Recruitment", recruiterUsername:null },

  { id:17, title:"ONGC Recruitment (Technical) 2025",       org:"Oil & Natural Gas Corporation",     type:"PSU",        edu:"B.Tech/Diploma",location:"All India",      salary:"₹40,000–1,40,000/mo",deadline:"20 Apr 2025",  vacancies:1225,  category:"PSU",     logo:"⛽",
    tags:["ONGC","PSU","Petroleum","Technical","Chemical","Mechanical"], skills:["Engineering","Chemistry","Physics","GK"],
    applyLink:"https://www.ongcindia.com/wps/wcm/connect/ongcl/home/careers/current-openings", notifLink:"https://ongcindia.com",
    books:["ONGC Previous Papers — Arihant","Chemical Engineering — Narayanan","Petroleum Engineering Handbook"],
    youtube:["https://youtube.com/results?search_query=ONGC+recruitment+2025"],
    recruiterId:null, recruiterName:"ONGC HR", recruiterUsername:null },

  { id:18, title:"State PSC Group B Officer 2025",          org:"State Public Service Commission",   type:"Government", edu:"Graduate",   location:"State-Based",      salary:"₹35,400–67,000/mo",  deadline:"Varies",       vacancies:5000,  category:"State",   logo:"🏢",
    tags:["PSC","State Govt","SDM","BDO","Naib Tehsildar"], skills:["State GK","History","Polity","Essay","Reasoning"],
    applyLink:"https://upsc.gov.in", notifLink:"https://upsc.gov.in",
    books:["State History & Culture","NCERT Polity 11-12","Lucent GK","State Geography"],
    youtube:["https://youtube.com/results?search_query=State+PSC+2025+preparation"],
    recruiterId:"r3", recruiterName:"UPSC Foundation", recruiterUsername:"upscfoundation22" },

  // ── PRIVATE / IT ───────────────────────────────────────────────────────────
  { id:19, title:"Software Engineer – Full Stack",          org:"Tata Consultancy Services",         type:"Private",    edu:"Graduate",   location:"Bangalore/Remote",  salary:"₹6–14 LPA",          deadline:"30 Mar 2025",  vacancies:500,   category:"IT",      logo:"💻",
    tags:["TCS","React","Node.js","Full Stack","IT"], skills:["JavaScript","React","Node.js","MongoDB","Git"],
    applyLink:"https://nextstep.tcs.com", notifLink:"https://nextstep.tcs.com",
    books:["JavaScript: The Good Parts","Clean Code — Robert Martin","Node.js Design Patterns"],
    youtube:["https://www.youtube.com/@Apnacollege","https://youtube.com/results?search_query=full+stack+development"],
    recruiterId:"r1", recruiterName:"TCS Talent Team", recruiterUsername:"tcshiring4521" },

  { id:20, title:"Data Analyst – Entry Level",              org:"Infosys BPM",                       type:"Private",    edu:"Graduate",   location:"Pune/Hyderabad",    salary:"₹4–7 LPA",           deadline:"10 Apr 2025",  vacancies:80,    category:"IT",      logo:"📊",
    tags:["Infosys","Python","SQL","Data","Analytics","BI"], skills:["Python","SQL","Excel","PowerBI","Statistics"],
    applyLink:"https://career.infosys.com", notifLink:"https://career.infosys.com",
    books:["Python for Data Analysis — Wes McKinney","SQL for Data Scientists","Data Science from Scratch"],
    youtube:["https://youtube.com/results?search_query=data+analyst+course+free","https://www.youtube.com/@codebasics"],
    recruiterId:"r2", recruiterName:"Infosys Careers", recruiterUsername:"infosysjobs3310", releasedAt:"2026-04-23T08:45:00.000Z" },

  { id:21, title:"Machine Learning Engineer",               org:"Wipro Technologies",                type:"Private",    edu:"Graduate+",  location:"Bangalore/Chennai", salary:"₹8–18 LPA",          deadline:"25 Apr 2025",  vacancies:60,    category:"IT",      logo:"🤖",
    tags:["ML","AI","Python","TensorFlow","PyTorch","Deep Learning"], skills:["Python","ML","TensorFlow","Statistics","NLP"],
    applyLink:"https://careers.wipro.com", notifLink:"https://careers.wipro.com",
    books:["Hands-On ML — Aurélien Géron","Deep Learning — Ian Goodfellow","Python ML — Sebastian Raschka"],
    youtube:["https://www.youtube.com/@Sentdex","https://youtube.com/results?search_query=machine+learning+full+course+free"],
    recruiterId:"r1", recruiterName:"TCS Talent Team", recruiterUsername:"tcshiring4521" },

  { id:22, title:"Java Backend Developer",                  org:"HCL Technologies",                  type:"Private",    edu:"Graduate",   location:"Noida/Chennai",     salary:"₹5–12 LPA",          deadline:"15 Apr 2025",  vacancies:200,   category:"IT",      logo:"☕",
    tags:["Java","Spring Boot","Microservices","HCL","Backend"], skills:["Java","Spring Boot","Microservices","SQL","REST API"],
    applyLink:"https://www.hcltech.com/careers", notifLink:"https://www.hcltech.com/careers",
    books:["Effective Java — Joshua Bloch","Spring in Action","Java: The Complete Reference"],
    youtube:["https://youtube.com/results?search_query=java+spring+boot+full+course"],
    recruiterId:"r2", recruiterName:"Infosys Careers", recruiterUsername:"infosysjobs3310" },

  { id:23, title:"DevOps Engineer",                         org:"Cognizant",                         type:"Private",    edu:"Graduate",   location:"Hyderabad/Pune",    salary:"₹7–16 LPA",          deadline:"30 Mar 2025",  vacancies:90,    category:"IT",      logo:"🔧",
    tags:["DevOps","AWS","Docker","Kubernetes","CI/CD","Cognizant"], skills:["AWS","Docker","Kubernetes","Linux","Jenkins","Git"],
    applyLink:"https://careers.cognizant.com", notifLink:"https://careers.cognizant.com",
    books:["The DevOps Handbook","Kubernetes in Action","The Phoenix Project"],
    youtube:["https://youtube.com/results?search_query=devops+full+course+free+2025"],
    recruiterId:"r1", recruiterName:"TCS Talent Team", recruiterUsername:"tcshiring4521" },

  { id:24, title:"Cybersecurity Analyst",                   org:"Tech Mahindra",                     type:"Private",    edu:"Graduate",   location:"Bangalore/Remote",  salary:"₹6–14 LPA",          deadline:"20 Apr 2025",  vacancies:40,    category:"IT",      logo:"🔐",
    tags:["Cybersecurity","Ethical Hacking","SOC","SIEM","CEH"], skills:["Networking","Linux","Python","SIEM","Ethical Hacking"],
    applyLink:"https://careers.techmahindra.com", notifLink:"https://careers.techmahindra.com",
    books:["CEH Study Guide","CompTIA Security+","The Web Application Hacker's Handbook"],
    youtube:["https://youtube.com/results?search_query=ethical+hacking+full+course+free"],
    recruiterId:"r2", recruiterName:"Infosys Careers", recruiterUsername:"infosysjobs3310" },

  { id:25, title:"UI/UX Designer",                          org:"Swiggy",                            type:"Private",    edu:"Any Graduate",location:"Bangalore/Remote",  salary:"₹6–15 LPA",          deadline:"15 Apr 2025",  vacancies:25,    category:"Design",  logo:"🎨",
    tags:["Figma","UI","UX","Swiggy","Product Design","Prototyping"], skills:["Figma","Sketch","Prototyping","User Research","HTML/CSS"],
    applyLink:"https://careers.swiggy.com", notifLink:"https://careers.swiggy.com",
    books:["Don't Make Me Think — Steve Krug","The Design of Everyday Things","Sprint — Jake Knapp"],
    youtube:["https://youtube.com/results?search_query=UI+UX+design+full+course+free"],
    recruiterId:"r1", recruiterName:"TCS Talent Team", recruiterUsername:"tcshiring4521" },

  // ── FINANCE / CA ──────────────────────────────────────────────────────────
  { id:26, title:"CA Inter / Final (Article Ship)",         org:"Big 4 CA Firms",                    type:"Private",    edu:"CA Course",  location:"Mumbai/Delhi/Bangalore",salary:"₹25,000–60,000/mo",deadline:"30 Apr 2025",  vacancies:2000,  category:"Finance", logo:"📑",
    tags:["CA","ICAI","Article","Audit","Tax","Finance"], skills:["Accounting","Tax","Audit","Financial Statements","GST"],
    applyLink:"https://icai.org", notifLink:"https://www.icai.org/new_post.html?post_id=16723",
    books:["ICAI Study Material","Direct Tax Laws — Vinod Gupta","Indirect Tax — V.S. Datey"],
    youtube:["https://youtube.com/results?search_query=CA+inter+exam+preparation"],
    recruiterId:"r2", recruiterName:"Infosys Careers", recruiterUsername:"infosysjobs3310" },

  { id:27, title:"Financial Analyst – Fresher",             org:"HDFC Asset Management",             type:"Private",    edu:"Graduate/MBA",location:"Mumbai",            salary:"₹5–9 LPA",           deadline:"20 Apr 2025",  vacancies:30,    category:"Finance", logo:"💹",
    tags:["Finance","HDFC","Investment","Portfolio","Equity","Research"], skills:["Financial Modeling","Excel","Valuation","Equity Research","Bloomberg"],
    applyLink:"https://careers.hdfcbank.com", notifLink:"https://www.hdfcbank.com/personal/about-us/careers",
    books:["Security Analysis — Benjamin Graham","Financial Modeling — Simon Benninga","CFA Level 1 Curriculum"],
    youtube:["https://youtube.com/results?search_query=financial+analyst+course+free"],
    recruiterId:"r4", recruiterName:"SBI HR Division", recruiterUsername:"sbihrdivision99" },

  { id:28, title:"GST Practitioner / Tax Associate",        org:"Deloitte India",                    type:"Private",    edu:"B.Com/CA Inter",location:"Delhi/Mumbai",     salary:"₹3.5–7 LPA",         deadline:"25 Apr 2025",  vacancies:50,    category:"Finance", logo:"💼",
    tags:["GST","Tax","Deloitte","Indirect Tax","B.Com","Finance"], skills:["GST","Income Tax","Tally","SAP","Accounting"],
    applyLink:"https://jobs.deloitte.com", notifLink:"https://www2.deloitte.com/in/en/pages/careers",
    books:["GST Made Easy — V.S. Datey","Indirect Tax Laws — ICAI","Tally Prime Guide"],
    youtube:["https://youtube.com/results?search_query=GST+practitioner+course+free"],
    recruiterId:"r2", recruiterName:"Infosys Careers", recruiterUsername:"infosysjobs3310" },

  // ── MEDICAL / HEALTH ──────────────────────────────────────────────────────
  { id:29, title:"NEET PG (Post Graduate Medical)",         org:"National Board of Examinations",    type:"Government", edu:"MBBS",       location:"All India",        salary:"₹70,000–2,00,000/mo",deadline:"01 Apr 2025",  vacancies:60000, category:"Medical", logo:"🏥",
    tags:["NEET","PG","MBBS","Doctor","Medical","MD","MS"], skills:["Clinical Medicine","Surgery","Pediatrics","Community Medicine"],
    applyLink:"https://nbe.edu.in", notifLink:"https://natboard.edu.in",
    books:["Harrison's Principles of Internal Medicine","Robbins Pathology","AIPGMEE Review — Amit Tripathi"],
    youtube:["https://youtube.com/results?search_query=NEET+PG+2025+preparation"],
    recruiterId:null, recruiterName:"NBE Official", recruiterUsername:null },

  { id:30, title:"Staff Nurse – AIIMS/Central Govt",        org:"AIIMS / Ministry of Health",        type:"Government", edu:"B.Sc Nursing",location:"All India",        salary:"₹35,400–1,12,400/mo",deadline:"15 May 2025",  vacancies:1500,  category:"Medical", logo:"💉",
    tags:["Nurse","AIIMS","Govt Hospital","GNM","B.Sc Nursing"], skills:["Clinical Nursing","Patient Care","Medical Records","First Aid"],
    applyLink:"https://aiims.edu", notifLink:"https://www.aiims.edu/en/jobs.html",
    books:["Nursing Foundation — Sharma & Sharma","Medical Surgical Nursing — Lewis","Community Health Nursing"],
    youtube:["https://youtube.com/results?search_query=AIIMS+Staff+Nurse+2025"],
    recruiterId:null, recruiterName:"AIIMS Official", recruiterUsername:null },

  // ── TEACHING ──────────────────────────────────────────────────────────────
  { id:31, title:"CTET (Central Teacher Eligibility Test)", org:"CBSE / Ministry of Education",      type:"Government", edu:"B.Ed/Graduation",location:"All India",       salary:"₹35,400–1,12,400/mo",deadline:"15 Apr 2025",  vacancies:99999, category:"Teaching",logo:"📚",
    tags:["CTET","Teacher","School","KVS","NVS","Primary","TGT","PGT"], skills:["Child Development","Teaching Methods","Subject Knowledge","EVS"],
    applyLink:"https://ctet.nic.in", notifLink:"https://ctet.nic.in",
    books:["CTET Child Development & Pedagogy — Pearson","CTET Paper I/II Guide — Arihant","NCF 2005"],
    youtube:["https://youtube.com/results?search_query=CTET+2025+preparation"],
    recruiterId:"r3", recruiterName:"UPSC Foundation", recruiterUsername:"upscfoundation22" },

  { id:32, title:"KVS TGT / PGT Teacher 2025",             org:"Kendriya Vidyalaya Sangathan",       type:"Government", edu:"Graduate/PG+B.Ed",location:"All India",      salary:"₹44,900–1,42,400/mo",deadline:"05 May 2025",  vacancies:7291,  category:"Teaching",logo:"🎓",
    tags:["KVS","Teacher","TGT","PGT","Central School","CBSE"], skills:["Teaching","Pedagogy","Subject Expertise","CTET Qualified"],
    applyLink:"https://kvsangathan.nic.in", notifLink:"https://kvsangathan.nic.in",
    books:["KVS TGT/PGT Guide — Arihant","Teaching Aptitude — Pearson","CTET Study Material"],
    youtube:["https://youtube.com/results?search_query=KVS+TGT+PGT+2025"],
    recruiterId:"r3", recruiterName:"UPSC Foundation", recruiterUsername:"upscfoundation22" },

  // ── POLICE / SECURITY ─────────────────────────────────────────────────────
  { id:33, title:"CBI Sub-Inspector 2025",                  org:"CBI / SSC",                         type:"Government", edu:"Graduate",   location:"All India",        salary:"₹35,400–1,12,400/mo",deadline:"30 Apr 2025",  vacancies:500,   category:"Police",  logo:"🔍",
    tags:["CBI","Sub-Inspector","Police","SSC CPO","Investigation"], skills:["GK","Reasoning","English","Physical Fitness"],
    applyLink:"https://ssc.nic.in", notifLink:"https://ssc.nic.in",
    books:["SSC CPO Guide — Arihant","Indian Penal Code","Criminal Procedure Code"],
    youtube:["https://youtube.com/results?search_query=SSC+CPO+2025"],
    recruiterId:null, recruiterName:"SSC Official", recruiterUsername:null },

  { id:34, title:"State Police Constable 2025",             org:"State Police Department",           type:"Government", edu:"12th Pass",  location:"State-Based",      salary:"₹21,700–69,100/mo",  deadline:"Varies",       vacancies:15000, category:"Police",  logo:"👮",
    tags:["Police","Constable","12th","State Govt","Physical","PST"], skills:["Physical Fitness","GK","Reasoning","Hindi/Regional Language"],
    applyLink:"https://upprpb.gov.in", notifLink:"https://upprpb.gov.in",
    books:["State Police Constable Guide — Arihant","General Hindi","Current Affairs"],
    youtube:["https://youtube.com/results?search_query=police+constable+2025"],
    recruiterId:null, recruiterName:"State Police", recruiterUsername:null },

  // ── ENGINEERING / PSU ─────────────────────────────────────────────────────
  { id:35, title:"BHEL Engineer Trainee 2025",              org:"BHEL",                              type:"PSU",        edu:"B.Tech/BE",  location:"Bhopal/Various",   salary:"₹40,000–1,40,000/mo",deadline:"25 Mar 2025",  vacancies:550,   category:"PSU",     logo:"⚡",
    tags:["BHEL","PSU","Engineer","Power","Electrical","Mechanical"], skills:["Electrical/Mechanical Engineering","GK","Technical Knowledge"],
    applyLink:"https://careers.bhel.in", notifLink:"https://careers.bhel.in",
    books:["BHEL Previous Papers — Disha","Made Easy GATE Notes","Power Systems — Stevenson"],
    youtube:["https://youtube.com/results?search_query=BHEL+engineer+trainee+2025"],
    recruiterId:null, recruiterName:"BHEL HR", recruiterUsername:null },

  { id:36, title:"BSNL Junior Telecom Officer",             org:"BSNL",                              type:"PSU",        edu:"B.Tech (ECE/CSE)",location:"All India",      salary:"₹43,000–1,38,000/mo",deadline:"10 Apr 2025",  vacancies:300,   category:"Telecom", logo:"📡",
    tags:["BSNL","JTO","Telecom","PSU","ECE","CSE"], skills:["Electronics","Telecom","Networking","Programming"],
    applyLink:"https://www.bsnl.co.in/opencms/bsnl/BSNL/about_us/company/recruitment.html", notifLink:"https://www.bsnl.co.in",
    books:["BSNL JTO Guide — Disha","Digital Communications — Haykin","Microwave Engineering — Pozar"],
    youtube:["https://youtube.com/results?search_query=BSNL+JTO+2025"],
    recruiterId:null, recruiterName:"BSNL HR", recruiterUsername:null },

  // ── CONTENT / MEDIA ───────────────────────────────────────────────────────
  { id:37, title:"Content Writer – SEO & Blog",             org:"Digital Startup",                   type:"Private",    edu:"Any Graduate",location:"Remote",            salary:"₹2–5 LPA",           deadline:"01 Apr 2025",  vacancies:20,    category:"Content", logo:"✍️",
    tags:["Content","Writing","SEO","Blog","Remote","Digital Marketing"], skills:["Writing","SEO","Research","WordPress","Canva"],
    applyLink:"https://internshala.com/jobs/content-writing-jobs", notifLink:"https://internshala.com",
    books:["Everybody Writes — Ann Handley","Content Strategy — Meghan Casey","SEO 2024 — Adam Clarke"],
    youtube:["https://youtube.com/results?search_query=content+writing+course+free"],
    recruiterId:"r2", recruiterName:"Infosys Careers", recruiterUsername:"infosysjobs3310" },

  { id:38, title:"Digital Marketing Executive",             org:"E-Commerce Company",                type:"Private",    edu:"Any Graduate",location:"Mumbai/Remote",     salary:"₹3–7 LPA",           deadline:"20 Mar 2025",  vacancies:30,    category:"Marketing",logo:"📱",
    tags:["Digital Marketing","SEO","SEM","Social Media","Google Ads"], skills:["Google Ads","SEO","Analytics","Canva","Email Marketing"],
    applyLink:"https://www.naukri.com", notifLink:"https://www.linkedin.com/jobs",
    books:["Digital Marketing — Vandana Ahuja","Google Analytics — Brian Clifton","Permission Marketing — Seth Godin"],
    youtube:["https://youtube.com/results?search_query=digital+marketing+full+course+free"],
    recruiterId:"r2", recruiterName:"Infosys Careers", recruiterUsername:"infosysjobs3310" },

  // ── INTERNSHIPS ───────────────────────────────────────────────────────────
  { id:39, title:"Frontend Developer Intern",               org:"Tech Startup",                      type:"Internship", edu:"Pursuing/Fresh",location:"Remote/Bangalore", salary:"₹10,000–25,000/mo",  deadline:"01 Apr 2025",  vacancies:10,    category:"IT",      logo:"🖥️",
    tags:["React","HTML","CSS","JavaScript","Internship","Frontend"], skills:["HTML","CSS","JavaScript","React","Git"],
    applyLink:"https://internshala.com", notifLink:"https://internshala.com",
    books:["JavaScript — Eloquent JavaScript (Free Online)","React Docs (Free)","CSS Tricks (Free Website)"],
    youtube:["https://www.youtube.com/@Apnacollege","https://youtube.com/results?search_query=react+tutorial+2025"],
    recruiterId:"r1", recruiterName:"TCS Talent Team", recruiterUsername:"tcshiring4521" },

  { id:40, title:"Data Science Intern",                     org:"Analytics Firm",                    type:"Internship", edu:"Pursuing/Fresh",location:"Remote",            salary:"₹8,000–20,000/mo",   deadline:"15 Apr 2025",  vacancies:8,     category:"IT",      logo:"📈",
    tags:["Data Science","Python","ML","Internship","Analytics","Pandas"], skills:["Python","Pandas","Matplotlib","SQL","Statistics"],
    applyLink:"https://internshala.com", notifLink:"https://internshala.com",
    books:["Python for Everybody (Free — Coursera)","Kaggle Free Courses","Data Science Handbook"],
    youtube:["https://youtube.com/results?search_query=data+science+internship+preparation"],
    recruiterId:"r1", recruiterName:"TCS Talent Team", recruiterUsername:"tcshiring4521" },

  { id:41, title:"Finance & Accounts Intern",               org:"Deloitte India",                    type:"Internship", edu:"B.Com/BBA",  location:"Delhi/Mumbai",      salary:"₹12,000–20,000/mo",  deadline:"10 Apr 2025",  vacancies:25,    category:"Finance", logo:"💰",
    tags:["Finance","Accounts","Internship","Deloitte","B.Com","Tally"], skills:["Accounting","Tally","Excel","GST","Bookkeeping"],
    applyLink:"https://jobs.deloitte.com", notifLink:"https://www2.deloitte.com/in/en/pages/careers",
    books:["Financial Accounting — T.S. Grewal","Tally Prime","Double Entry Book Keeping"],
    youtube:["https://youtube.com/results?search_query=accounting+tally+course+free"],
    recruiterId:"r2", recruiterName:"Infosys Careers", recruiterUsername:"infosysjobs3310" },

  // ── LAW ───────────────────────────────────────────────────────────────────
  { id:42, title:"CLAT (Common Law Admission Test)",        org:"Consortium of NLUs",                type:"Government", edu:"12th Pass",  location:"All India",        salary:"Career Pathway",     deadline:"15 Mar 2025",  vacancies:3000,  category:"Law",     logo:"⚖️",
    tags:["CLAT","NLU","Law","LLB","Legal","Advocate"], skills:["Legal Reasoning","English","GK","Logical Reasoning","Maths"],
    applyLink:"https://consortiumofnlus.ac.in", notifLink:"https://consortiumofnlus.ac.in",
    books:["Legal Aptitude — A.P. Bhardwaj","Universal's CLAT Guide","Legal Reasoning — Pearson"],
    youtube:["https://youtube.com/results?search_query=CLAT+2025+preparation"],
    recruiterId:null, recruiterName:"NLU Consortium", recruiterUsername:null },

  { id:43, title:"Junior Legal Associate",                  org:"Cyril Amarchand Mangaldas",         type:"Private",    edu:"LLB/LLM",   location:"Mumbai/Delhi",      salary:"₹6–14 LPA",          deadline:"30 Apr 2025",  vacancies:20,    category:"Law",     logo:"📜",
    tags:["Law","LLB","Corporate Law","Legal","Advocate","Litigation"], skills:["Contract Law","Corporate Law","Research","Drafting","Litigation"],
    applyLink:"https://www.cyrilshroff.com/careers", notifLink:"https://www.cyrilshroff.com",
    books:["Company Law — Avtar Singh","Contract Act — Pollock & Mulla","Corporate Laws — ICSI"],
    youtube:["https://youtube.com/results?search_query=corporate+law+India+course"],
    recruiterId:"r2", recruiterName:"Infosys Careers", recruiterUsername:"infosysjobs3310" },

  // ── AGRICULTURE / SCIENCE ─────────────────────────────────────────────────
  { id:44, title:"ICAR JRF (Junior Research Fellow)",       org:"ICAR – Indian Agriculture Research",type:"Government", edu:"M.Sc Agriculture",location:"All India",       salary:"₹31,000/mo",         deadline:"10 Apr 2025",  vacancies:500,   category:"Science", logo:"🌾",
    tags:["ICAR","JRF","Agriculture","Research","Science","PhD"], skills:["Agriculture","Biology","Statistics","Research Methods"],
    applyLink:"https://icar.org.in", notifLink:"https://icar.org.in/content/recruitment",
    books:["Fundamentals of Agronomy — Yellamanda Reddy","Plant Physiology — Taiz & Zeiger","ICAR JRF Guide — Arihant"],
    youtube:["https://youtube.com/results?search_query=ICAR+JRF+2025"],
    recruiterId:null, recruiterName:"ICAR Official", recruiterUsername:null },

  { id:45, title:"Scientist B – CSIR Research",             org:"CSIR Labs",                         type:"Government", edu:"M.Sc/PhD",   location:"Various",          salary:"₹56,100+/mo",        deadline:"30 Mar 2025",  vacancies:200,   category:"Science", logo:"🔬",
    tags:["CSIR","Scientist","Research","Chemistry","Biology","Physics"], skills:["Research","Lab Skills","Data Analysis","Scientific Writing"],
    applyLink:"https://www.csir.res.in", notifLink:"https://www.csir.res.in/recruitment",
    books:["Gate Life Sciences Guide","Molecular Biology — Watson","Research Methodology — C.R. Kothari"],
    youtube:["https://youtube.com/results?search_query=CSIR+NET+2025"],
    recruiterId:null, recruiterName:"CSIR Official", recruiterUsername:null },

  // ── COMMERCE / MANAGEMENT ─────────────────────────────────────────────────
  { id:46, title:"MBA – CAT 2025 (IIM Admission)",          org:"IIM / Top B-Schools",               type:"Private",    edu:"Graduate",   location:"All India",        salary:"Career Pathway",     deadline:"25 Nov 2025",  vacancies:4500,  category:"MBA",     logo:"🎯",
    tags:["CAT","MBA","IIM","Management","PGDM","Business"], skills:["Quant","Verbal","LRDI","Analytical Reasoning"],
    applyLink:"https://iimcat.ac.in", notifLink:"https://iimcat.ac.in",
    books:["How to Prepare for CAT — Arun Sharma","Quantitative Aptitude — Arun Sharma","Word Power Made Easy — Norman Lewis"],
    youtube:["https://youtube.com/results?search_query=CAT+2025+preparation","https://www.youtube.com/@CATking"],
    recruiterId:"r3", recruiterName:"UPSC Foundation", recruiterUsername:"upscfoundation22" },

  { id:47, title:"HR Executive – Entry Level",              org:"MNC India",                         type:"Private",    edu:"BBA/MBA HR", location:"Delhi/Remote",      salary:"₹3–5 LPA",           deadline:"15 Apr 2025",  vacancies:25,    category:"HR",      logo:"👥",
    tags:["HR","Human Resources","Recruitment","MBA","BBA","Payroll"], skills:["Recruitment","Payroll","HR Policies","Excel","Communication"],
    applyLink:"https://www.naukri.com", notifLink:"https://www.linkedin.com/jobs",
    books:["Human Resource Management — Gary Dessler","Industrial Relations — Mamoria","SHRM Essentials"],
    youtube:["https://youtube.com/results?search_query=HR+executive+course+free"],
    recruiterId:"r2", recruiterName:"Infosys Careers", recruiterUsername:"infosysjobs3310" },

  // ── ARTS / SOCIAL SCIENCES ────────────────────────────────────────────────
  { id:48, title:"Social Worker – NGO & Govt",              org:"Various NGOs / Social Welfare Dept",type:"Government", edu:"BSW/MSW",    location:"All India",        salary:"₹20,000–50,000/mo",  deadline:"Varies",       vacancies:1000,  category:"Social",  logo:"🤝",
    tags:["NGO","Social Work","Community Development","MSW","Rural Development"], skills:["Communication","Community Outreach","Report Writing","Field Work"],
    applyLink:"https://ngo.india.gov.in", notifLink:"https://socialjustice.nic.in",
    books:["Social Work Practice — Malcolm Payne","Methods of Social Work","Community Organization"],
    youtube:["https://youtube.com/results?search_query=social+work+career+India"],
    recruiterId:null, recruiterName:"Govt Social Welfare", recruiterUsername:null },

  { id:49, title:"Graphic Designer – Fresher",              org:"Ad Agency / Startup",               type:"Private",    edu:"Any / BFA/Diploma",location:"Delhi/Remote",   salary:"₹2.5–6 LPA",         deadline:"30 Mar 2025",  vacancies:15,    category:"Design",  logo:"🎨",
    tags:["Graphic Design","Figma","Photoshop","Illustrator","Adobe","Canva"], skills:["Photoshop","Figma","Canva","Illustrator","Typography"],
    applyLink:"https://internshala.com", notifLink:"https://internshala.com",
    books:["The Non-Designer's Design Book","Logo Design Love — David Airey","Grid Systems — Josef Müller-Brockmann"],
    youtube:["https://youtube.com/results?search_query=graphic+design+full+course+free"],
    recruiterId:"r2", recruiterName:"Infosys Careers", recruiterUsername:"infosysjobs3310" },

  { id:50, title:"BPSC (Bihar PSC) 2025",                   org:"Bihar Public Service Commission",   type:"Government", edu:"Graduate",   location:"Bihar",            salary:"₹35,400–67,000/mo",  deadline:"30 Apr 2025",  vacancies:2200,  category:"State",   logo:"🏛️",
    tags:["BPSC","Bihar","State PSC","SDO","BDO","Officer"], skills:["GK","History","Geography","Polity","Bihar GK","Essay"],
    applyLink:"https://www.bpsc.bih.nic.in", notifLink:"https://www.bpsc.bih.nic.in",
    books:["Bihar GK — Arihant","History of Bihar","NCERT All Subjects","Lucent GK"],
    youtube:["https://youtube.com/results?search_query=BPSC+2025+preparation"],
    recruiterId:"r3", recruiterName:"UPSC Foundation", recruiterUsername:"upscfoundation22" },

  { id:51, title:"MPSC (Maharashtra PSC) 2025",             org:"Maharashtra Public Service Comm.",  type:"Government", edu:"Graduate",   location:"Maharashtra",      salary:"₹38,600–1,22,800/mo",deadline:"15 May 2025",  vacancies:800,   category:"State",   logo:"🏢",
    tags:["MPSC","Maharashtra","State PSC","Tehsildar","PSI","STI"], skills:["Maharashtra GK","History","Polity","Marathi","Essay"],
    applyLink:"https://mpsc.gov.in", notifLink:"https://mpsc.gov.in",
    books:["Maharashtra GK","Punit Balan — MPSC Guide","NCERT History","Current Affairs"],
    youtube:["https://youtube.com/results?search_query=MPSC+2025+preparation"],
    recruiterId:"r3", recruiterName:"UPSC Foundation", recruiterUsername:"upscfoundation22" },

  { id:52, title:"Product Manager – EdTech Startup",        org:"EdTech Startup",                    type:"Private",    edu:"Graduate/MBA",location:"Bangalore/Remote",  salary:"₹12–25 LPA",         deadline:"20 Apr 2025",  vacancies:5,     category:"Product", logo:"📦",
    tags:["Product Manager","EdTech","Roadmap","Agile","B2C","Startup"], skills:["Product Strategy","Agile","Data Analysis","User Research","Roadmap"],
    applyLink:"https://www.linkedin.com/jobs", notifLink:"https://www.linkedin.com/jobs",
    books:["Inspired — Marty Cagan","Zero to One — Peter Thiel","Cracking the PM Interview"],
    youtube:["https://youtube.com/results?search_query=product+manager+course+free"],
    recruiterId:"r1", recruiterName:"TCS Talent Team", recruiterUsername:"tcshiring4521" },

  { id:53, title:"Pharmacist – Govt Hospital",              org:"Ministry of Health / ESIC",         type:"Government", edu:"D.Pharma/B.Pharma",location:"All India",     salary:"₹29,200–92,300/mo",  deadline:"10 Apr 2025",  vacancies:450,   category:"Medical", logo:"💊",
    tags:["Pharmacist","D.Pharma","B.Pharma","Govt Hospital","ESIC","Drug Store"], skills:["Pharmacy","Drug Dispensing","Pharmacology","Patient Counseling"],
    applyLink:"https://esic.nic.in/recruitment", notifLink:"https://esic.nic.in",
    books:["Pharmacognosy — Kokate","Hospital Pharmacy — Remington","D.Pharma Guide — Nirali"],
    youtube:["https://youtube.com/results?search_query=pharmacist+exam+preparation+2025"],
    recruiterId:null, recruiterName:"ESIC Official", recruiterUsername:null },

  { id:54, title:"Civil Engineer – L&T Construction",       org:"Larsen & Toubro",                   type:"Private",    edu:"B.Tech Civil",location:"Pan India",         salary:"₹4.5–9 LPA",         deadline:"30 Apr 2025",  vacancies:200,   category:"Engineering",logo:"🏗️",
    tags:["Civil Engineering","L&T","Construction","Site Engineer","PMC"], skills:["AutoCAD","Structural Analysis","Site Management","Estimation","STAAD.Pro"],
    applyLink:"https://www.larsentoubro.com/careers", notifLink:"https://www.larsentoubro.com",
    books:["RCC Design — B.C. Punmia","Fluid Mechanics — Modi & Seth","IS Codes for Civil Engineers"],
    youtube:["https://youtube.com/results?search_query=civil+engineering+jobs+L&T"],
    recruiterId:"r2", recruiterName:"Infosys Careers", recruiterUsername:"infosysjobs3310" },

  { id:55, title:"Chartered Accountant (Final) – Industry", org:"Fortune 500 Indian Companies",      type:"Private",    edu:"CA Final",   location:"Mumbai/Bangalore",  salary:"₹8–18 LPA",          deadline:"Ongoing",      vacancies:1000,  category:"Finance", logo:"🏆",
    tags:["CA","Chartered Accountant","Finance","Audit","Tax","CFO Track"], skills:["Financial Reporting","IFRS","Tax Planning","Audit","SAP"],
    applyLink:"https://icai.org", notifLink:"https://www.icai.org",
    books:["ICAI Advanced Accounts","SFM — ICAI Study Material","Direct Tax — Vinod Gupta"],
    youtube:["https://youtube.com/results?search_query=CA+Final+exam+2025"],
    recruiterId:"r2", recruiterName:"Infosys Careers", recruiterUsername:"infosysjobs3310" },
  { id:56, title:"Prompt Engineer / AI Workflow Associate", org:"AI Product Studio India",           type:"Private",    edu:"Graduate",   location:"Remote/Bangalore",  salary:"₹7–14 LPA",          deadline:"12 May 2026",  vacancies:42,    category:"IT",      logo:"🧠",
    tags:["AI","Prompt Engineering","LLM","Automation","GPT","Workflow"], skills:["Prompt Design","Python","APIs","Automation","Communication"],
    applyLink:"https://www.linkedin.com/jobs", notifLink:"https://www.linkedin.com/jobs",
    books:["Prompt Engineering Guide","Python Crash Course","Designing Data-Intensive Applications"],
    youtube:["https://youtube.com/results?search_query=prompt+engineering+full+course"],
    recruiterId:"r1", recruiterName:"TCS Talent Team", recruiterUsername:"tcshiring4521", releasedAt:"2026-04-21T09:15:00.000Z" },

  { id:57, title:"GenAI Analyst – Freshers",                org:"Accenture Applied Intelligence",    type:"Private",    edu:"Graduate",   location:"Hyderabad/Remote",  salary:"₹6–10 LPA",          deadline:"18 May 2026",  vacancies:65,    category:"IT",      logo:"🤖",
    tags:["GenAI","LLM","Analytics","SQL","Python","NLP"], skills:["Python","SQL","Data Analysis","Prompting","NLP"],
    applyLink:"https://www.accenture.com/in-en/careers", notifLink:"https://www.accenture.com/in-en/careers",
    books:["Hands-On ML","Practical Statistics for Data Scientists","Prompt Engineering for Everyone"],
    youtube:["https://youtube.com/results?search_query=genai+analyst+course"],
    recruiterId:"r2", recruiterName:"Infosys Careers", recruiterUsername:"infosysjobs3310", releasedAt:"2026-04-20T10:00:00.000Z" },

  { id:58, title:"IBPS SO IT Officer 2026",                 org:"IBPS",                              type:"Government", edu:"B.Tech/BCA", location:"All India",        salary:"₹38,000–55,000/mo",  deadline:"20 May 2026",  vacancies:1580,  category:"Banking", logo:"💻",
    tags:["IBPS","SO","IT Officer","Banking","Government"], skills:["Networking","DBMS","Programming","Security","Reasoning"],
    applyLink:"https://www.ibps.in", notifLink:"https://www.ibps.in",
    books:["IBPS SO IT Officer Guide","Computer Awareness","Networking Essentials"],
    youtube:["https://youtube.com/results?search_query=ibps+so+it+officer+2026"],
    recruiterId:null, recruiterName:"IBPS Official", recruiterUsername:null, releasedAt:"2026-04-19T07:45:00.000Z" },

  { id:59, title:"Railway Technician Recruitment 2026",     org:"Railway Recruitment Board",         type:"Government", edu:"ITI/Diploma",location:"All India",         salary:"₹29,200–92,300/mo",  deadline:"28 May 2026",  vacancies:9140,  category:"Railway", logo:"🚆",
    tags:["Railway","Technician","RRB","ITI","Government"], skills:["Technical Trade","Maths","Reasoning","Safety","Science"],
    applyLink:"https://www.rrbcdg.gov.in", notifLink:"https://indianrailways.gov.in",
    books:["RRB Technician Previous Papers","Lucent General Science","ITI Trade Theory"],
    youtube:["https://youtube.com/results?search_query=rrb+technician+2026+preparation"],
    recruiterId:null, recruiterName:"RRB Official", recruiterUsername:null, releasedAt:"2026-04-18T11:10:00.000Z" },

  { id:60, title:"UGC NET JRF 2026",                        org:"National Testing Agency",           type:"Government", edu:"Postgraduate",location:"All India",       salary:"₹37,000+/mo",        deadline:"25 May 2026",  vacancies:4800,  category:"Education", logo:"📚",
    tags:["UGC NET","JRF","Assistant Professor","Research","Government"], skills:["Subject Knowledge","Research Aptitude","Teaching Aptitude","Reasoning"],
    applyLink:"https://ugcnet.nta.ac.in", notifLink:"https://ugcnet.nta.ac.in",
    books:["UGC NET Paper 1 Guide","Research Aptitude Notes","Subject-wise Master Book"],
    youtube:["https://youtube.com/results?search_query=ugc+net+jrf+2026+preparation"],
    recruiterId:null, recruiterName:"NTA Official", recruiterUsername:null, releasedAt:"2026-04-17T09:00:00.000Z" },

  { id:61, title:"Industrial Trainee – CA / CMA",           org:"Mahindra Finance",                  type:"Private",    edu:"CA/CMA Inter",location:"Mumbai/Pune",      salary:"₹28,000–52,000/mo",  deadline:"10 May 2026",  vacancies:120,   category:"Finance", logo:"💼",
    tags:["CA Inter","CMA","Industrial Training","Finance","Accounts"], skills:["Accounting","MIS","Taxation","Excel","ERP"],
    applyLink:"https://careers.mahindra.com", notifLink:"https://careers.mahindra.com",
    books:["ICAI Industrial Training Notes","Advanced Accounting","Excel for Finance"],
    youtube:["https://youtube.com/results?search_query=industrial+training+ca+inter"],
    recruiterId:"r4", recruiterName:"SBI HR Division", recruiterUsername:"sbihrdivision99", releasedAt:"2026-04-16T12:20:00.000Z" },
];

const CATEGORIES = ["All","Government","Private","PSU","Defence","Internship","IT","Banking","Railway","Finance","Medical","Teaching","Engineering","Design","Law","Science","Marketing","State"];

export default function Jobs({ onMessage, initialFilters }) {
  const uKey    = user.id || user.email || "guest";
  const [saved,   setSaved]   = useState(()=>JSON.parse(localStorage.getItem(`cb_saved_${uKey}`)||"[]"));
  const [applied, setApplied] = useState(()=>JSON.parse(localStorage.getItem(`cb_applied_${uKey}`)||"[]"));
  const [cat,     setCat]     = useState("All");
  const [type,    setType]    = useState("All");
  const [search,  setSearch]  = useState("");
  const [sort,    setSort]    = useState("latest");
  const [expanded,setExpanded]= useState(null);
  const [showRes, setShowRes] = useState(null); // show resources

  useEffect(() => {
    if (!initialFilters) return;
    if (typeof initialFilters.search === "string") setSearch(initialFilters.search);
    if (initialFilters.type) setType(initialFilters.type);
    if (initialFilters.category) setCat(initialFilters.category);
    if (initialFilters.sort) setSort(initialFilters.sort);
    if (initialFilters.spotlightId) {
      setExpanded(initialFilters.spotlightId);
      setShowRes(initialFilters.spotlightId);
    } else {
      setExpanded(null);
      setShowRes(null);
    }
  }, [initialFilters]);

  const saveJob = (id) => {
    const isS    = saved.includes(id);
    const updated = isS ? saved.filter(x=>x!==id) : [...saved,id];
    setSaved(updated);
    localStorage.setItem(`cb_saved_${uKey}`, JSON.stringify(updated));
    if (!isS) {
      const job = JOBS.find(j=>j.id===id);
      const a   = JSON.parse(localStorage.getItem(`cb_activity_${uKey}`)||"[]");
      a.unshift({ type:"saved", icon:"⭐", label:`Saved: ${job?.title}`, time:new Date().toISOString() });
      localStorage.setItem(`cb_activity_${uKey}`, JSON.stringify(a.slice(0,40)));
    }
  };

  const applyJob = (job) => {
    if (!applied.includes(job.id)) {
      const updated = [...applied, job.id];
      setApplied(updated);
      localStorage.setItem(`cb_applied_${uKey}`, JSON.stringify(updated));
      const a = JSON.parse(localStorage.getItem(`cb_activity_${uKey}`)||"[]");
      a.unshift({ type:"applied", icon:"📨", label:`Applied: ${job.title}`, time:new Date().toISOString() });
      localStorage.setItem(`cb_activity_${uKey}`, JSON.stringify(a.slice(0,40)));
    }
    window.open(job.applyLink, "_blank");
  };

  const msgRecruiter = (job) => {
    if (onMessage && job.recruiterId) {
      onMessage({ id:job.recruiterId, name:job.recruiterName, username:job.recruiterUsername, role:"recruiter", org:job.org });
    }
  };

  const list = JOBS.filter(j => {
    const ms = !search || j.title.toLowerCase().includes(search.toLowerCase()) || j.org.toLowerCase().includes(search.toLowerCase()) || j.tags.some(t=>t.toLowerCase().includes(search.toLowerCase())) || j.category.toLowerCase().includes(search.toLowerCase());
    const mc = cat==="All" || j.category===cat || j.type===cat;
    const mt = type==="All" || j.type===type;
    return ms && mc && mt;
  }).sort((a,b)=> sort==="vacancies" ? b.vacancies-a.vacancies : b.id-a.id);

  return (
    <div>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",flexWrap:"wrap",gap:"14px",marginBottom:"18px"}}>
        <div>
          <div style={S.overline}>55+ Real Opportunities · All Fields · 10th to PG</div>
          <h2 style={S.title}>Browse Jobs</h2>
        </div>
        <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
          {[["🏛️","Govt",JOBS.filter(j=>j.type==="Government"||j.type==="PSU"||j.type==="Defence").length],
            ["💼","Private",JOBS.filter(j=>j.type==="Private").length],
            ["🎓","Intern",JOBS.filter(j=>j.type==="Internship").length],
            ["⭐","Saved",saved.length],
            ["✅","Applied",applied.length]
          ].map(([ic,lb,ct])=>(
            <div key={lb} style={{display:"flex",alignItems:"center",gap:"5px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"9px",padding:"7px 12px"}}>
              <span>{ic}</span><span style={{fontWeight:700,color:"#fff",fontSize:"13px"}}>{ct}</span><span style={{color:"#64748b",fontSize:"11px"}}>{lb}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Search */}
      <div style={S.searchBox}>
        <span style={{color:"#475569"}}>🔍</span>
        <input style={S.searchInput} placeholder="Search jobs, organisations, skills, exam..." value={search} onChange={e=>setSearch(e.target.value)}/>
        {search && <button onClick={()=>setSearch("")} style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:"16px"}}>✕</button>}
      </div>

      {/* Category chips */}
      <div style={{display:"flex",gap:"6px",flexWrap:"wrap",margin:"14px 0 10px"}}>
        {["All","Government","Private","PSU","Defence","Internship"].map(t=>(
          <button key={t} onClick={()=>setType(t===type?"All":t)}
            style={{padding:"7px 14px",borderRadius:"8px",border:`1px solid ${type===t?"rgba(30,64,175,0.4)":"rgba(255,255,255,0.08)"}`,background:type===t?"rgba(30,64,175,0.2)":"transparent",color:type===t?"#93c5fd":"#64748b",fontSize:"12px",fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
            {t}
          </button>
        ))}
        <div style={{flex:1}}/>
        <select value={cat} onChange={e=>setCat(e.target.value)} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",color:"#94a3b8",borderRadius:"8px",padding:"7px 12px",fontSize:"12px",fontFamily:"'DM Sans',sans-serif",outline:"none"}}>
          {CATEGORIES.map(c=><option key={c} style={{background:"#0f1f38"}}>{c}</option>)}
        </select>
        <select value={sort} onChange={e=>setSort(e.target.value)} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",color:"#94a3b8",borderRadius:"8px",padding:"7px 12px",fontSize:"12px",fontFamily:"'DM Sans',sans-serif",outline:"none"}}>
          <option value="latest">Latest First</option>
          <option value="vacancies">Most Vacancies</option>
        </select>
      </div>

      <div style={{fontSize:"13px",color:"#64748b",marginBottom:"14px"}}>{list.length} of {JOBS.length} jobs</div>

      {/* Cards */}
      <div style={S.grid}>
        {list.map(job => {
          const isSaved   = saved.includes(job.id);
          const isApplied = applied.includes(job.id);
          const isExp     = expanded === job.id;
          const isRes     = showRes  === job.id;
          const tc        = TYPE_COLOR[job.type] || TYPE_COLOR.Private;

          return (
            <div key={job.id} style={{...S.card,...(isExp||isRes?S.cardOpen:{})}}>
              {/* Type badge */}
              <div style={{position:"absolute",top:"14px",right:"14px",fontSize:"10px",fontWeight:700,padding:"3px 10px",borderRadius:"50px",background:tc.bg,color:tc.color,border:`1px solid ${tc.border}`}}>
                {job.type}
              </div>

              {/* Card body */}
              <div style={{display:"flex",gap:"12px",marginBottom:"10px",paddingRight:"72px"}}>
                <div style={S.logo}>{job.logo}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:"14px",fontWeight:700,color:"#fff",marginBottom:"2px",lineHeight:1.3}}>{job.title}</div>
                  <div style={{fontSize:"12px",color:"#64748b"}}>{job.org}</div>
                  <div style={{fontSize:"11px",color:"#475569",marginTop:"2px"}}>📚 {job.edu}</div>
                </div>
              </div>

              {/* Chips */}
              <div style={{display:"flex",flexWrap:"wrap",gap:"5px",marginBottom:"10px"}}>
                {[`📍 ${job.location}`,`💰 ${job.salary}`,`👥 ${job.vacancies.toLocaleString()}`,`⏰ ${job.deadline}`].map(c=>(
                  <span key={c} style={{fontSize:"10px",color:"#94a3b8",background:"rgba(255,255,255,0.04)",padding:"3px 7px",borderRadius:"5px"}}>{c}</span>
                ))}
              </div>

              {/* Skills */}
              <div style={{display:"flex",flexWrap:"wrap",gap:"4px",marginBottom:"10px"}}>
                {job.skills.map(sk=><span key={sk} style={{fontSize:"10px",color:"#93c5fd",background:"rgba(30,64,175,0.12)",padding:"3px 7px",borderRadius:"4px"}}>{sk}</span>)}
              </div>

              {/* Recruiter row */}
              <div style={{display:"flex",alignItems:"center",gap:"8px",padding:"8px 10px",background:"rgba(255,255,255,0.03)",borderRadius:"8px",marginBottom:"12px",border:"1px solid rgba(255,255,255,0.05)"}}>
                <div style={{width:"26px",height:"26px",borderRadius:"7px",background:"linear-gradient(135deg,#1e40af,#d4af37)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",fontWeight:700,color:"#fff",flexShrink:0}}>
                  {job.recruiterName[0]}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:"12px",fontWeight:600,color:"#e2e8f0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{job.recruiterName}</div>
                  {job.recruiterUsername && <div style={{fontSize:"10px",color:"#475569",fontFamily:"monospace"}}>@{job.recruiterUsername}</div>}
                </div>
                {job.recruiterId && user.role==="seeker" && (
                  <button onClick={()=>msgRecruiter(job)}
                    style={{background:"rgba(30,64,175,0.15)",border:"1px solid rgba(30,64,175,0.3)",color:"#93c5fd",borderRadius:"7px",padding:"5px 10px",fontSize:"11px",fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap"}}>
                    💬 Message
                  </button>
                )}
              </div>

              {/* Actions */}
              <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
                <button onClick={()=>applyJob(job)}
                  style={{flex:1,...S.applyBtn,...(isApplied?{background:"linear-gradient(135deg,#16a34a,#22c55e)",color:"#000"}:{})}}>
                  {isApplied?"✅ Applied →":"🚀 Apply Now"}
                </button>
                <button onClick={()=>setShowRes(isRes?null:job.id)}
                  style={{...S.iconBtn,color:isRes?"#d4af37":"#64748b",borderColor:isRes?"rgba(212,175,55,0.4)":"rgba(255,255,255,0.1)",background:isRes?"rgba(212,175,55,0.08)":"rgba(255,255,255,0.04)"}} title="Books & Resources">
                  📚
                </button>
                <button onClick={()=>window.open(job.notifLink,"_blank")} style={{...S.iconBtn,color:"#94a3b8"}} title="Official Notification">📄</button>
                <button onClick={()=>saveJob(job.id)} style={{...S.iconBtn,color:isSaved?"#d4af37":"#475569",borderColor:isSaved?"rgba(212,175,55,0.4)":"rgba(255,255,255,0.1)"}}>
                  {isSaved?"⭐":"☆"}
                </button>
                <button onClick={()=>setExpanded(isExp?null:job.id)} style={{...S.iconBtn,color:"#64748b"}}>
                  {isExp?"▲":"▼"}
                </button>
              </div>

              {/* Resources section */}
              {isRes && (
                <div style={{marginTop:"14px",paddingTop:"14px",borderTop:"1px solid rgba(255,255,255,0.06)"}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                    <div>
                      <div style={{fontSize:"12px",fontWeight:700,color:"#d4af37",marginBottom:"8px",textTransform:"uppercase",letterSpacing:"0.5px"}}>📖 Recommended Books</div>
                      {job.books.map((b,i)=>(
                        <div key={i} style={{fontSize:"11px",color:"#94a3b8",padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,0.04)",display:"flex",gap:"6px"}}>
                          <span style={{flexShrink:0}}>📕</span><span>{b}</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div style={{fontSize:"12px",fontWeight:700,color:"#d4af37",marginBottom:"8px",textTransform:"uppercase",letterSpacing:"0.5px"}}>▶️ Free YouTube Courses</div>
                      {job.youtube.map((link,i)=>(
                        <button key={i} onClick={()=>window.open(link,"_blank")}
                          style={{display:"block",width:"100%",textAlign:"left",background:"rgba(30,64,175,0.1)",border:"1px solid rgba(30,64,175,0.2)",color:"#93c5fd",padding:"6px 10px",borderRadius:"7px",fontSize:"11px",cursor:"pointer",marginBottom:"6px",fontFamily:"'DM Sans',sans-serif"}}>
                          ▶ Course {i+1} →
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Expanded details */}
              {isExp && (
                <div style={{marginTop:"14px",paddingTop:"14px",borderTop:"1px solid rgba(255,255,255,0.06)"}}>
                  <div style={{fontSize:"12px",fontWeight:700,color:"#d4af37",marginBottom:"8px"}}>About This Opportunity</div>
                  <p style={{fontSize:"12px",color:"#94a3b8",lineHeight:1.7,marginBottom:"12px"}}>
                    <strong style={{color:"#fff"}}>{job.org}</strong> is hiring for <strong style={{color:"#fff"}}>{job.title}</strong>. 
                    Total <strong style={{color:"#d4af37"}}>{job.vacancies.toLocaleString()}</strong> vacancies. 
                    Education: <strong style={{color:"#fff"}}>{job.edu}</strong>. Last date: <strong style={{color:"#f87171"}}>{job.deadline}</strong>.
                  </p>
                  <div style={{fontSize:"11px",fontWeight:700,color:"#64748b",marginBottom:"6px",textTransform:"uppercase"}}>Required Skills</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:"5px",marginBottom:"12px"}}>
                    {job.skills.map(sk=><span key={sk} style={{fontSize:"12px",color:"#93c5fd",background:"rgba(30,64,175,0.12)",padding:"4px 10px",borderRadius:"50px",border:"1px solid rgba(30,64,175,0.2)"}}>{sk}</span>)}
                  </div>
                  <div style={{display:"flex",gap:"8px"}}>
                    <button onClick={()=>applyJob(job)} style={{flex:1,...S.applyBtn}}>🚀 Apply on Official Portal</button>
                    {job.recruiterId && user.role==="seeker" && (
                      <button onClick={()=>msgRecruiter(job)}
                        style={{flex:1,background:"rgba(30,64,175,0.15)",border:"1px solid rgba(30,64,175,0.3)",color:"#93c5fd",borderRadius:"9px",padding:"10px",fontSize:"12px",fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
                        💬 Message Recruiter
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {list.length===0 && (
        <div style={{textAlign:"center",padding:"60px",color:"#64748b"}}>
          <div style={{fontSize:"40px",marginBottom:"10px"}}>🔍</div>
          <div style={{fontSize:"16px",fontWeight:700,color:"#fff",marginBottom:"6px"}}>No jobs found</div>
          <div>Try different search or category filter</div>
        </div>
      )}
    </div>
  );
}

const S = {
  overline:{fontSize:"11px",fontWeight:700,letterSpacing:"2px",textTransform:"uppercase",color:"#d4af37",marginBottom:"4px"},
  title:{fontSize:"26px",fontWeight:900,color:"#fff",fontFamily:"'Playfair Display',serif"},
  searchBox:{display:"flex",alignItems:"center",gap:"8px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"10px",padding:"10px 14px",width:"100%",boxSizing:"border-box"},
  searchInput:{background:"transparent",border:"none",outline:"none",color:"#fff",fontSize:"14px",flex:1,fontFamily:"'DM Sans',sans-serif"},
  grid:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:"14px"},
  card:{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"16px",padding:"18px",position:"relative",transition:"all 0.3s"},
  cardOpen:{border:"1px solid rgba(212,175,55,0.22)",boxShadow:"0 8px 32px rgba(0,0,0,0.28)"},
  logo:{fontSize:"26px",width:"44px",height:"44px",background:"rgba(255,255,255,0.05)",borderRadius:"11px",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},
  applyBtn:{background:"linear-gradient(135deg,#1e40af,#3b82f6)",color:"#fff",border:"none",borderRadius:"8px",padding:"9px 14px",fontSize:"12px",fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",transition:"all 0.2s"},
  iconBtn:{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"8px",padding:"9px 12px",fontSize:"13px",cursor:"pointer",transition:"all 0.2s"},
};
