import React, { useState } from "react";
import axios from "axios";
import appIcon from './assets/ftox_icon.png'; // Import app icon
import { FaWindows, FaApple, FaAndroid, FaLaptop, FaTabletAlt, FaMobileAlt } from "react-icons/fa";
import Swal from "sweetalert2";

function GymRegistration() {
      const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    ownerName: "",
    gymName: "",
    location: "",
    mobileNumber: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const response = await axios.post(
        "https://oxadmedia.online/api/add-newgym",
        {
          owner: formData.ownerName,
          gymname: formData.gymName,
          location: formData.location,
          mob: formData.mobileNumber,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

    //  console.log("Server Response:", response.data);
     if (response.data.success) {
        setLoading(false);
 Swal.fire({
    iconHtml: '🏋️', // gym emoji instead of default icon
    title: 'Under Verification',
    html: `<p style="font-size:16px;color:#444;">You will receive a call from Fitox once your account is verified and activated.</p>`,
    background: '#f0f8ff', // light sporty feel
    confirmButtonText: 'OK 💪',
    confirmButtonColor: '#ff5722', // sporty orange
    customClass: {
      title: 'swal-title-gym',
      popup: 'swal-popup-gym'
    }
  }).then(() => {
    // Clear form fields after closing Swal
    setFormData({
      ...formData,
      ownerName: "",
      gymName: "",
      location: "",
      mobileNumber: "",
    });
  });

} else {
        alert("Failed to register gym: " + response.data.message);
        setLoading(false);
      }
    } catch (error) {
      console.error("Error saving gym:", error);
      alert("An error occurred while saving.");
        setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      ownerName: "",
      gymName: "",
      location: "",
      mobileNumber: "",
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
       {loading && (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/10 backdrop-blur-sm z-50">
      <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-3 text-gray-700 font-medium">Registering...</p>
    </div>
  )}

      <div className="bg-white shadow-lg rounded-2xl w-full max-w-md p-6">
        {/* App Hero Section */}

<div className="text-center mb-6">
  <img src={appIcon} alt="Fitox Logo" className="h-16 mx-auto rounded-lg mb-3" />
  
  <h1 className="text-2xl font-bold text-gray-800">Fitox Gym Management</h1>
  
  {/* Icons Row */}
  <div className="flex justify-center items-center mt-4 divide-x divide-gray-300">
  {/* Windows */}
  <div className="px-4 text-center">
    <FaWindows className="text-blue-600 text-3xl mx-auto" />
    <p className="text-xs text-gray-600 mt-1">Windows</p>
  </div>

  {/* Mac */}
  <div className="px-4 text-center">
    <FaApple className="text-gray-800 text-3xl mx-auto" />
    <p className="text-xs text-gray-600 mt-1">Mac</p>
  </div>

  {/* Android */}
  <div className="px-4 text-center">
    <FaAndroid className="text-green-600 text-3xl mx-auto" />
    <p className="text-xs text-gray-600 mt-1">Android</p>
  </div>
</div>

  <p className="text-gray-600 mt-4">
    Manage your entire gym at one place
  </p>
 
</div>

        {/* Registration Form */}
        <h2 className="text-xl font-semibold text-center text-red-500 mb-4">
          Are you new here?
        </h2>

        <div className="space-y-4">
          {/* Owner Name */}
          <div>
            <label className="block font-medium mb-1">Gym Owner Name</label>
            <input
              type="text"
              name="ownerName"
              value={formData.ownerName}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Enter owner's name"
            />
          </div>

          {/* Gym Name */}
          <div>
            <label className="block font-medium mb-1">Gym Name</label>
            <input
              type="text"
              name="gymName"
              value={formData.gymName}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Enter gym name"
            />
          </div>

          {/* Mobile Number */}
          <div>
            <label className="block font-medium mb-1">Mobile Number</label>
            <input
              type="tel"
              name="mobileNumber"
              value={formData.mobileNumber}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Enter mobile number"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block font-medium mb-1">Location</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Enter location"
            />
          </div>

          {/* Buttons */}
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 bg-gray-400 text-white py-2 rounded-lg hover:bg-gray-500 transition"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition"
            >
              Sign Up
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center mt-2">
            🚀 No credit card required. Quick setup in 2 minutes!
          </p>
        </div>
      </div>
   
    </div>

  );
}

export default GymRegistration;
