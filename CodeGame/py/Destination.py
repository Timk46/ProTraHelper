from Actor import Actor, ActorDirection, ActorType

class Destination(Actor):
    def __init__(self, x, y, direction, actor_type, world):
        """
        Initialize a new Destination object.

        Args:
            x (int): The x-coordinate of the destination.
            y (int): The y-coordinate of the destination.
            direction (str): The direction the destination is facing.
            actor_type (str): The type of actor associated with the destination.
            world (World): The world in which the destination exists.
        """
        super().__init__(x, y, direction, actor_type, world)

    def act(self):
        """
        Performs the action for the Destination object.

        Since the Destination does not have any actions to perform, this method is intentionally left empty.
        """
        # Destination does not act
        pass
