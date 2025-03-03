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
 * @brief Outputs a message indicating the removal of a item at the specified coordinates.
 * 
 * @param x The x-coordinate of the item to be removed.
 * @param y The y-coordinate of the item to be removed.
 */
void SystemOutput::outputRemoveItem(int x, int y)
{
    std::lock_guard<std::mutex> lock(mtx);

    std::cout << "#SYS-RemoveItem:" << x << "/" << y << std::endl;
}



/**
 * @brief Outputs a system warning message to the standard output.
 * 
 * In clase the player leaves the play filed - game over.
 */
void SystemOutput::outputWarning()
{
    std::lock_guard<std::mutex> lock(mtx);

    std::cout << "#SYS-Warning" << std::endl;
}


/**
 * @brief Outputs the success status of the system.
 *
 * @param reachedDestination A boolean indicating if the destination was reached.
 * @param totalItems The total number of items.
 * @param collectedItems The number of collected items.
 */
void SystemOutput::outputSuccess(bool reachedDestination, int totalItems, int collectedItems)
{
    std::lock_guard<std::mutex> lock(mtx);

    std::cout << "#SYS-Success:" << reachedDestination << "/" << totalItems << "/" << collectedItems << std::endl;
}