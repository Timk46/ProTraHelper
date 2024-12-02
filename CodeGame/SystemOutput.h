#ifndef SYSTEMOUTPUT_H
#define SYSTEMOUTPUT_H

#include <iostream>
#include <string>
#include <mutex>

/**
 * @class SystemOutput
 * @brief Singleton class for thread-safe system output operations.
 * 
 * This outputs will be used to drwa the world and the actors by the front end.
 */
class SystemOutput {
    private: 
         // Private constructor
        SystemOutput() {}

        // Mutex for thread-safe printing
        std::mutex mtx;

    public:
        // Delete copy constructor and assignment operator
        SystemOutput(const SystemOutput&) = delete;
        SystemOutput& operator=(const SystemOutput&) = delete;

        // Static method to get the singleton instance
        static SystemOutput& getInstance() {
            static SystemOutput instance;
            return instance;
        }   

        void outputMove(int& x, int& y);
        void outputTrun(const std::string& message);
        void outputInformation(std::string message);
};

#endif // SYSTEMOUTPUT_H