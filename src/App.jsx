import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import Login from "./Login";
import GymList from "./GymList";
import SettingScreen from "./settingScreen";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import HomeScreen from "./HomeScreen";




import GymRegistration from "./NewRegisterscreen";

import PoseCorrect from "./PoseCorrector";

import BicepCurlFormCorrector from "./BicepForm";
import TricepCurlFormCorrector from "./tricepForm";


function App() {
  // Helper function to check standalone mode
  const isRunningStandalone = () =>
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  const [isStandalone, setIsStandalone] = useState(isRunningStandalone);

  useEffect(() => {
    setIsStandalone(isRunningStandalone);
  }, []);

  return (
    <Router basename="/fitoxme">
        <ToastContainer
        position="top-center"
        autoClose={1500} // close after 3 seconds
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        theme="light"
      />
      <Routes>
        {/* Root route renders dynamically based on standalone mode */}
        <Route path="/" element={isStandalone ? <Login /> : <Login />} />
        <Route path="/login" element={<Login />} />
                <Route path="/GymList" element={<GymList />} />
                <Route path="/home" element={<HomeScreen />} />
                <Route path="/settings" element={<SettingScreen />} />
                <Route path="/activeClients" element={<BicepCurlFormCorrector />} />
        <Route path="/add-member" element={<BicepCurlFormCorrector />} />
        <Route path="/trainer-list" element={<TricepCurlFormCorrector />} />
        <Route path="/transac-hist" element={<BicepCurlFormCorrector />} />
        <Route path="/dash-admin" element={<BicepCurlFormCorrector />} />
        <Route path="/analytics-screen" element={<BicepCurlFormCorrector />} />
        <Route path="/inactive-screen" element={<BicepCurlFormCorrector />} />
        <Route path="/register-screen" element={<GymRegistration />} />
        <Route path="/enquire_now" element={<BicepCurlFormCorrector />} />
        <Route path="/lead_data" element={<BicepCurlFormCorrector />} />
        <Route path="/add_lead" element={<BicepCurlFormCorrector />} />
        <Route path="/install_page" element={<BicepCurlFormCorrector />} />
        <Route path="/bio-dash" element={<BicepCurlFormCorrector />} />
        <Route path="/fitox-hub" element={<BicepCurlFormCorrector />} />

      </Routes>
    </Router>
    
  );
}

export default App;
