import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { UserPlusIcon } from "@heroicons/react/24/outline";
import myBackground from "./assets/fitxgym.jpg";
//import UpgradeDialog from "./UpgradeDialog";
import Swal from 'sweetalert2';
import clientIcon from "./assets/clienticn.png"; // adjust path to match your project
import adminIcon from "./assets/adminicn.png"; // adjust path to match your project
import transacIcon from "./assets/transactionicn.png"; // adjust path to match your project
import dashIcon from "./assets/menu.png"; // adjust path to match your project
import anaIcon from "./assets/analytics.png"; // adjust path to match your project
import inactiveIcon from "./assets/inactive.png"; // adjust path to match your project
import settingIcon from "./assets/settings.png"; // adjust path to match your project
import addleadIcon from "./assets/lead.png"; // adjust path to match your project
import leadIcon from "./assets/leadfunnel.png"; // adjust path to match your project
import upgradeIcon from "./assets/upgrade.png"; // adjust path to match your project
import hubIcon from "./assets/hubicn.png"; // adjust path to match your project

import { showUpgradePopup } from './helper/reuse.js';
 
function HomeScreen() {
    const [selectedGym, setSelectedGym] = useState(null);
    const navigate = useNavigate();
    const apiBase = "https://oxadmedia.online";
const [trainers, setTrainers] = useState([]);
 const [backgroundImage, setBackgroundImage] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  //const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
let wakeLock = null;
async function enableWakeLock() {
  try {
    wakeLock = await navigator.wakeLock.request("screen");
    console.log("Screen wake lock enabled");

    // Re-activate if it gets released (e.g., tab switch, minimize)
    wakeLock.addEventListener("release", () => {
      console.log("Wake lock released");
    });

  } catch (err) {
    console.error(`Wake lock failed: ${err.message}`);
  }
}
useEffect(() => {
  const img = new Image();
  img.src = myBackground;
  img.onload = () => {
    setBackgroundImage(myBackground); // use imported image
    setIsLoaded(true);
  };
}, []);
useEffect(() => {
  enableWakeLock();
    const storedGym = localStorage.getItem("selectedGym");

    if (storedGym) {
        const parsedGym = JSON.parse(storedGym);
setSelectedGym(parsedGym);
        const token = localStorage.getItem("accessToken");
        const cachedTrainers = localStorage.getItem(`trainersdata_${parsedGym.GymId}`);

        if (cachedTrainers) {
           const parsedTrainers = JSON.parse(cachedTrainers);

  //  console.log("📦 Loaded trainers from localStorage:", parsedTrainers);

    setTrainers(parsedTrainers);
        } else {
            console.log("🌐 Fetching trainers from API...");
            fetchTrainers(parsedGym.GymId, token); // ✅ use parsedGym directly
        }
    }
}, []);

// const handleAddAdmin = () => {
//   navigate("/trainer-list", {
//     state: {
//       type: "add", // 👈 type is "add"
//     },
//   });
// };
 
const handleAddMember = () => {
  navigate("/add-member", {
    state: {
      type: "add", // 👈 type is "add"
    },
  });
};
const fetchTrainers = async (gymId,token) => {
    try {
        const response = await axios.get(`${apiBase}/api/fetch-trainer?gymid=${gymId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

        if (response.data.success) {
         //   console.log("✅ Trainer data fetched:", response.data.result);
            setTrainers(response.data.result); // Save to state
              localStorage.setItem(
    `trainersdata_${gymId}`, // ✅ use the function parameter
    JSON.stringify(response.data.result)

                

);
        } else {
            console.error("❌ API error:", response.data.message);
           // setError(response.data.message);
        }
    } catch (err) {
        console.error("🔥 Error fetching trainers:", err);
       // setError("Failed to fetch trainers.");
    }
};
    const tabs = [
        { name: "Bicep Curl", gradient: "from-green-400 to-green-600" },
        { name: "Tricep Curl", gradient: "from-orange-400 to-orange-600" },
        { name: "Squats", gradient: "from-purple-400 to-purple-600" },
        { name: "Shoulder Press", gradient: "from-red-400 to-red-600" },
        { name: "Lateral raises", gradient: "from-blue-400 to-blue-600" },
        { name: "Front raises", gradient: "from-gray-800 to-gray-500" },
        { name: "Settings", gradient: "from-pink-800 to-pink-500" },
        { name: "Squats Side", gradient: "from-yellow-800 to-yellow-500" },
        { name: "Bent-over rows", gradient: "from-violet-800 to-violet-500" },
            //    { name: "Biometric", gradient: "from-blue-800 to-blue-500" },
        { name: "Deadlifts", gradient: "from-blue-800 to-blue-500" },

//{ name: "Upgrade", gradient: "from-[#FFD700] to-[#FFA500]" }



    ];
const handleTabClick = (tabName) => {
        if (tabName === "Settings") {
            navigate("/settings");
        } else if (tabName === "Bicep Curl"){
            navigate("/activeClients");
        }else if (tabName === "Tricep Curl"){
            navigate("/trainer-list");

       
        }else if (tabName === "Squats"){
            navigate("/transac-hist");

        
        } else if (tabName === "Shoulder Press"){
            navigate("/dash-admin");

        
        }else if (tabName === "Lateral raises"){
            navigate("/analytics-screen");

        
        }else if (tabName === "Biometric"){
            navigate("/bio-dash");

        
        }else if (tabName === "Deadlifts"){
         
            navigate("/fitox-hub");

        
        }else if (tabName === "Front raises"){
             const storedGym = localStorage.getItem("selectedGym");
        const parsedGym = JSON.parse(storedGym);
navigate("/inactive-screen");
// if (Number(parsedGym.is_active) === 1) {
// showUpgradePopup({
//   price: "₹5000 / Year",
//   titleIs: "Limit Exceeded"
//  });
// } else {
//     navigate("/inactive-screen");
// }
        
        }else if (tabName === "Squats Side"){
            navigate("/lead_data");

        
        }else if (tabName === "Bent-over rows"){
   const storedGym = localStorage.getItem("selectedGym");
 if (storedGym) {
        const parsedGym = JSON.parse(storedGym);
        navigate(`/add_lead?gymid=${parsedGym.GymId}`);
 }
        
        }else{
           // console.log(`Navigating to ${tabName}`);

        }
    };
  return (
    
<div className="fixed inset-0 bg-black min-h-screen relative">

<div
  className={`fixed inset-0 bg-center bg-black transition-opacity duration-1000 ${
    isLoaded ? "opacity-100 bg-cover" : "opacity-0"
  }`}
  style={{
        backgroundColor: "black", // always black base

    backgroundImage: isLoaded ? `url(${myBackground})` : "none",
  }}
>
  {/* Black overlay */}
  <div className="absolute inset-0 bg-black/50"></div>
</div>
    
  
    {/*   <UpgradeDialog
        isOpen={showUpgradeDialog}
        onClose={() => setShowUpgradeDialog(false)}
        gymName={selectedGym?.GymName}
        gymId={selectedGym?.GymId}
      /> */}
   
      {/* Background overlay for contrast 
{selectedGym && (
  <div
    className={`sticky top-0 z-50 w-full text-black text-center py-3 font-bold shadow-md
      ${selectedGym.is_active > 1 ? 'bg-[#FFD700]' : 'bg-yellow-500'}`}
  >
    {selectedGym.is_active > 1 ? (
    <>
  <span className="drop-shadow-[0_0_2px_black]">🌟</span>
  <span className="text-black font-semibold ml-2">
    Fitox Premium
  </span>
</>
    ) : (
      <>
        🎯 You’re on Freemium —{" "}
        <span
          className="underline cursor-pointer"
          onClick={() => {
           showUpgradePopup({
  price: "₹5000 / Year",
  titleIs: "Upgrade Now"
 });
          }}
        >
          Upgrade Now
        </span>
      </>
    )}
  </div>
)}
*/}
{/* Gym name below upgrade */}
<div
//  className="sticky top-[48px] z-40 bg-black w-full p-4 pt-6 pb-6 text-center"

  className="sticky top-[0px] z-40 bg-black w-full p-4 pt-6 pb-6 text-center"
>
  <h1 className="text-3xl font-bold text-white/90">
    {selectedGym?.GymName}
    {selectedGym?.Location && `, ${selectedGym.Location}`}
  </h1>
</div>

    <div className="relative z-10 min-h-screen overflow-y-auto ">

        {/* Content section */}
<div className="flex-1 overflow-y-auto p-5 w-full">
        

          <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
  {tabs.map((tab, index) => (
  <div
    key={index}
    className={`p-8 rounded-xl text-white text-lg font-semibold shadow-lg bg-gradient-to-r ${tab.gradient} hover:scale-102 transform transition flex flex-col items-center justify-center gap-3 opacity-85 hover:opacity-100`}
    onClick={() => handleTabClick(tab.name)}
  >
    {/* Show image above Active Clients */}
    {tab.name === "Bicep Curl" && (
      <img
        src={clientIcon}
        alt="Client Icon"
        className="w-12 h-12 filter brightness-0 invert" // white tint
      />
    )}
 {tab.name === "Tricep Curl" && (
      <img
        src={adminIcon}
        alt="Client Icon"
        className="w-12 h-12 filter brightness-0 invert" // white tint
      />
    )}
     {tab.name === "Squats" && (
      <img
        src={transacIcon}
        alt="Client Icon"
        className="w-12 h-12 filter brightness-0 invert" // white tint
      />
    )}
    {tab.name === "Shoulder Press" && (
      <img
        src={dashIcon}
        alt="Client Icon"
        className="w-12 h-12 filter brightness-0 invert" // white tint
      />
    )}
        {tab.name === "Lateral raises" && (
      <img
        src={anaIcon}
        alt="Client Icon"
        className="w-12 h-12 filter brightness-0 invert" // white tint
      />
    )}
       {tab.name === "Front raises" && (
      <img
        src={inactiveIcon}
        alt="Client Icon"
        className="w-12 h-12 filter brightness-0 invert" // white tint
      />
    )}
    {tab.name === "Settings" && (
      <img
        src={settingIcon}
        alt="Client Icon"
        className="w-12 h-12 filter brightness-0 invert" // white tint
      />
    )}
    {tab.name === "Squats Side" && (
      <img
        src={leadIcon}
        alt="Client Icon"
        className="w-12 h-12 filter brightness-0 invert" // white tint
      />
    )}
      {tab.name === "Bent-over rows" && (
      <img
        src={addleadIcon}
        alt="Client Icon"
        className="w-12 h-12 filter brightness-0 invert" // white tint
      />
    )}
     {tab.name === "Deadlifts" && (
      <img
        src={hubIcon}
        alt="Hub Icon"
        className="w-12 h-12 filter brightness-0 invert" // white tint
      />
    )}
    {/* Name and add member icon in one row */}
    <div className="flex items-center gap-2">
      <span>{tab.name}</span>

      {/* {tab.name === "Bicep Curl" && (
        <div className="relative group">
          <div
            onClick={(e) => {
              e.stopPropagation();
              handleAddMember();
            }}
            className="flex items-center justify-center rounded-full bg-white hover:bg-gray-200 active:scale-95 cursor-pointer p-2 shadow transition"
          >
            <UserPlusIcon className="h-5 w-5 text-black" />
          </div>
          <span className="absolute bottom-full mb-2 text-xs text-white bg-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition">
            Add Member
          </span>
        </div>
      )} */}
    </div>
  </div>
))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomeScreen;
