package game;

public class SystemOutput {
    private static SystemOutput instance;
    private final Object lock = new Object();

    private SystemOutput() {}

    /**
     * Returns the singleton instance of the SystemOutput class.
     * If the instance is null, it initializes a new SystemOutput object.
     *
     * @return the singleton instance of SystemOutput
     */
    public static SystemOutput getInstance() {
        if (instance == null) {
            instance = new SystemOutput();
        }
        return instance;
    }

    /**
     * Outputs the move coordinates to the system output in a synchronized manner.
     * The output format is "#SYS-Move:x/y".
     *
     * @param x the x-coordinate of the move
     * @param y the y-coordinate of the move
     */
    public void outputMove(int x, int y) {
        synchronized (lock) {
            System.out.println("#SYS-Move:" + x + "/" + y);
        }
    }

    /**
     * Outputs a turn message to the system console with a specific prefix.
     * This method is synchronized to ensure thread safety.
     *
     * @param message the message to be outputted, prefixed with "#SYS-Turn:"
     */
    public void outputTurn(String message) {
        synchronized (lock) {
            System.out.println("#SYS-Turn:" + message);
        }
    }

    /**
     * Outputs the given message to the system console with a "#SYS-Info:" prefix.
     * This method is thread-safe, ensuring that only one thread can execute it at a time.
     *
     * @param message the information message to be outputted
     */
    public void outputInformation(String message) {
        synchronized (lock) {
            System.out.println("#SYS-Info:" + message);
        }
    }

    /**
     * Outputs a system message indicating that an item has been removed at the specified coordinates.
     * The message is synchronized to ensure thread safety.
     *
     * @param x the x-coordinate of the item to be removed
     * @param y the y-coordinate of the item to be removed
     */
    public void outputRemoveItem(int x, int y) {
        synchronized (lock) {
            System.out.println("#SYS-RemoveItem:" + x + "/" + y);
        }
    }

    /**
     * Outputs a system warning message to the console.
     * This method is synchronized to ensure thread safety.
     */
    public void outputWarning() {
        synchronized (lock) {
            System.out.println("#SYS-Warning");
        }
    }

    /**
     * Outputs a success message to the system console.
     *
     * @param reachedDestination the number of items that reached their destination
     * @param totalItems the total number of items
     * @param collectedItems the number of items that were collected
     */
    public void outputSuccess(int reachedDestination, int totalItems, int collectedItems) {
        synchronized (lock) {
            System.out.println("#SYS-Success:" + reachedDestination + "/" + totalItems + "/" + collectedItems);
        }
    }
}