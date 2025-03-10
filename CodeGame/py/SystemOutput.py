import threading

class SystemOutput:
    _instance = None
    _lock = threading.Lock()

    def __init__(self):
        """
        Initializes the SystemOutput singleton instance.
        
        Raises:
            Exception: If an instance of the singleton already exists.
        """
        if SystemOutput._instance is not None:
            raise Exception("This class is a singleton!")
        else:
            SystemOutput._instance = self
        self._lock = threading.Lock()

    @staticmethod
    def get_instance():
        """
        Returns the singleton instance of the SystemOutput class.
        
        This method ensures that only one instance of the SystemOutput class
        is created (singleton pattern). If the instance does not exist, it
        creates one in a thread-safe manner.
        
        Returns:
            SystemOutput: The singleton instance of the SystemOutput class.
        """
        if SystemOutput._instance is None:
            with SystemOutput._lock:
                if SystemOutput._instance is None:
                    SystemOutput()
        return SystemOutput._instance

    def output_move(self, x, y):
        """
        Outputs the move coordinates in a specific format.

        This method prints the move coordinates (x, y) in the format "#SYS-Move:x/y".
        The method is thread-safe, ensuring that the output is not interrupted by other threads.

        Args:
            x (int): The x-coordinate of the move.
            y (int): The y-coordinate of the move.
        """
        with self._lock:
            print(f"#SYS-Move:{x}/{y}")

    def output_turn(self, message):
        """
        Outputs a turn message to the console with a specific format.

        Args:
            message (str): The message to be outputted for the turn.
        """
        with self._lock:
            print(f"#SYS-Turn:{message}")

    def output_information(self, message):
        """
        Outputs an informational message to the system console.

        This method acquires a lock to ensure thread-safe printing of the message.

        Args:
            message (str): The informational message to be printed.
        """
        with self._lock:
            print(f"#SYS-Info:{message}")

    def output_remove_item(self, x, y):
        """
        Outputs a system message indicating that an item has been removed at the specified coordinates.

        Args:
            x (int): The x-coordinate of the item to be removed.
            y (int): The y-coordinate of the item to be removed.

        Output:
            Prints a system message in the format "#SYS-RemoveItem:x/y".
        """
        with self._lock:
            print(f"#SYS-RemoveItem:{x}/{y}")

    def output_warning(self):
        """
        Outputs a system warning message.

        This method acquires a lock to ensure thread safety and then prints
        a system warning message to the console.
        """
        with self._lock:
            print("#SYS-Warning")

    def output_success(self, reached_destination, total_items, collected_items):
        """
        Outputs a success message indicating the result of an operation.

        Args:
            reached_destination (bool): Indicates if the destination was reached.
            total_items (int): The total number of items involved in the operation.
            collected_items (int): The number of items successfully collected.

        Returns:
            None
        """
        with self._lock:
            print(f"#SYS-Success:{reached_destination}/{total_items}/{collected_items}")
