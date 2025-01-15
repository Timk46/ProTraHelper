#include "SystemOutput.h"

#include <iostream>

/**
 * @brief Outputs the move coordinates to the standard output.
 * 
 * @param x Reference to the x-coordinate of the move.
 * @param y Reference to the y-coordinate of the move.
 */
void SystemOutput::outputMove(int x, int y)
{
    std::lock_guard<std::mutex> lock(mtx);

    std::cout << "#SYS-Move:" << x << "/" << y << std::endl;
}

/**
 * @brief Outputs a system turn message to the console.
 * 
 * @param message The message to be output.
 */
void SystemOutput::outputTrun(const std::string message)
{
    std::lock_guard<std::mutex> lock(mtx);

    std::cout << "#SYS-Turn:" << message << std::endl;
}

/**
 * @brief Outputs a system information message to the console.
 * 
 * @param message The information message to be output.
 */
void SystemOutput::outputInformation(std::string message)
{
    std::lock_guard<std::mutex> lock(mtx);

    std::cout << "#SYS-Info:" << message << std::endl;
}

/**
 * @brief Outputs a message indicating the removal of a rock at the specified coordinates.
 * 
 * @param x The x-coordinate of the rock to be removed.
 * @param y The y-coordinate of the rock to be removed.
 */
void SystemOutput::outputRemoveRock(int x, int y)
{
    std::lock_guard<std::mutex> lock(mtx);

    std::cout << "#SYS-RemoveRock:" << x << "/" << y << std::endl;
}

/**
 * @brief Outputs the success status of the system.
 *
 * @param reachedDestination A boolean indicating if the destination was reached.
 * @param rocksInGame A boolean indicating if there are rocks in the game.
 * @param collectedAllRocks A boolean indicating if all rocks were collected.
 */
void SystemOutput::outputSuccess(bool reachedDestination, bool rocksInGame, bool collectedAllRocks)
{
    std::lock_guard<std::mutex> lock(mtx);

    std::cout << "#SYS-Success:" << reachedDestination << "/" << rocksInGame << "/" << collectedAllRocks << std::endl;
}