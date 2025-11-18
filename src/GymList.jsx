import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ImCheckmark } from "react-icons/im";

function GymList() {
    const navigate = useNavigate();
    const [gyms, setGyms] = useState([]);

    useEffect(() => {
        // Load gyms from localStorage
        const storedGyms = localStorage.getItem("gyms");
        if (storedGyms) {
            setGyms(JSON.parse(storedGyms));
        }
    }, []);

    const handleSelectGym = (gym) => {
        localStorage.setItem("selectedGym", JSON.stringify(gym));
        navigate("/home");
    };

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Select Your Gym</h1>

            <div className="border rounded-lg shadow max-h-[500px] overflow-y-auto">
                <ul className="divide-y">
                    {gyms.map((gym) => (
                        <li
                            key={gym.Id}
                            className="p-3 flex justify-between items-center hover:bg-gray-100 cursor-pointer"
                            onClick={() => handleSelectGym(gym)}
                        >
                            <div>
                                <p className="font-semibold">{gym.GymName}</p>
                                <p className="text-sm text-gray-500">{gym.Location}</p>
                            </div>
                            <ImCheckmark className="text-green-600" />
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

export default GymList;
