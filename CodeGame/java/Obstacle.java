package game;

/**
 * The Obstacle class represents an immovable object in the game world.
 * It extends the Actor class but does not perform any actions.
 * 
 * @param x The x-coordinate of the obstacle.
 * @param y The y-coordinate of the obstacle.
 * @param actorDirectionInWorld The direction the obstacle is facing.
 * @param actorType The type of the actor.
 * @param world The game world the obstacle belongs to.
 */
public class Obstacle extends Actor {
    public Obstacle(int x, int y, ActorDirectionInWorld actorDirectionInWorld, ActorType actorType, World world) {
        super(x, y, actorDirectionInWorld, actorType, world);
    }

    /**
     * This method is overridden to define the behavior of the obstacle.
     * In this case, the obstacle does not perform any actions.
     */
    @Override
    public void act() {
        // Obstacle does not act
    }
}
