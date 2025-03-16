from Actor import Actor, ActorDirectionInWorld, ActorType

class Obstacle(Actor):
    def __init__(self, x, y, direction, actor_type, world):
        """
        Initialize an Obstacle object.

        Args:
            x (int): The x-coordinate of the obstacle.
            y (int): The y-coordinate of the obstacle.
            direction (str): The direction the obstacle is facing.
            actor_type (str): The type of actor the obstacle represents.
            world (World): The world object the obstacle belongs to.
        """
        super().__init__(x, y, direction, actor_type, world)

    def act(self):
        """
        Perform an action for the obstacle.

        This method is intentionally left blank as obstacles do not perform any actions.
        """
        # Obstacle does not act
        pass
